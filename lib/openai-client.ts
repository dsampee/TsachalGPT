import OpenAI from "openai"
import { createClient } from "@/lib/supabase/server"

interface OpenAIRequestLog {
  prompt_hash: string
  file_ids: string[]
  token_count: number
  duration_ms: number
  status: "success" | "error" | "timeout" | "rate_limited"
  error_message?: string
  retry_count: number
  user_id?: string
}

class RobustOpenAIClient {
  private client: OpenAI | null = null
  private maxRetries = 3
  private baseDelay = 1000 // 1 second
  private maxDelay = 30000 // 30 seconds
  private timeout = 75000 // 75 seconds (between 60-90 as requested)
  private initializationError: string | null = null

  constructor() {
    try {
      if (!process.env.OPENAI_API_KEY) {
        this.initializationError = "OpenAI API key not configured"
        console.error("[v0] RobustOpenAI: OpenAI API key not configured")
        return
      }

      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        timeout: this.timeout,
      })
      console.log("[v0] RobustOpenAI: Client initialized successfully")
    } catch (error) {
      this.initializationError = `Failed to initialize OpenAI client: ${error instanceof Error ? error.message : "Unknown error"}`
      console.error("[v0] RobustOpenAI: Initialization failed:", error)
    }
  }

  private ensureInitialized(): void {
    if (this.initializationError) {
      throw new Error(this.initializationError)
    }
    if (!this.client) {
      throw new Error("OpenAI client not properly initialized")
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay)
    const jitter = Math.random() * 0.3 * exponentialDelay // 30% jitter
    return exponentialDelay + jitter
  }

  private shouldRetry(error: any): boolean {
    if (error?.status === 429) return true // Rate limit
    if (error?.status >= 500 && error?.status < 600) return true // Server errors
    if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") return true // Network errors
    return false
  }

  private generatePromptHash(content: string): string {
    // Simple hash function for logging
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private async logRequest(log: OpenAIRequestLog): Promise<void> {
    try {
      const supabase = await createClient()
      await supabase.from("api_request_logs").insert({
        prompt_hash: log.prompt_hash,
        file_ids: log.file_ids,
        token_count: log.token_count,
        duration_ms: log.duration_ms,
        status: log.status,
        error_message: log.error_message,
        retry_count: log.retry_count,
        user_id: log.user_id,
        created_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error("Failed to log API request:", error)
    }
  }

  async chatCompletion(params: any, fileIds: string[] = [], userId?: string): Promise<any> {
    this.ensureInitialized()

    const startTime = Date.now()
    const promptContent = JSON.stringify(params.messages)
    const promptHash = this.generatePromptHash(promptContent)
    let lastError: any
    let retryCount = 0

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[v0] OpenAI chat completion attempt ${attempt + 1}/${this.maxRetries + 1}`)

        const response = await this.client!.chat.completions.create(params)
        const duration = Date.now() - startTime

        // Log successful request
        await this.logRequest({
          prompt_hash: promptHash,
          file_ids: fileIds,
          token_count: response.usage?.total_tokens || 0,
          duration_ms: duration,
          status: "success",
          retry_count: retryCount,
          user_id: userId,
        })

        console.log(`[v0] OpenAI request completed successfully in ${duration}ms`)
        return response
      } catch (error: any) {
        lastError = error
        retryCount = attempt
        const duration = Date.now() - startTime

        console.log(`[v0] OpenAI request failed on attempt ${attempt + 1}: ${error.message}`)

        // Log failed request
        await this.logRequest({
          prompt_hash: promptHash,
          file_ids: fileIds,
          token_count: 0,
          duration_ms: duration,
          status: error.status === 429 ? "rate_limited" : duration >= this.timeout ? "timeout" : "error",
          error_message: error.message,
          retry_count: retryCount,
          user_id: userId,
        })

        // Don't retry on the last attempt
        if (attempt === this.maxRetries) break

        // Check if we should retry
        if (!this.shouldRetry(error)) {
          console.log(`[v0] Error not retryable: ${error.status} ${error.message}`)
          break
        }

        // Calculate backoff delay
        const delay = this.calculateBackoffDelay(attempt)
        console.log(`[v0] Retrying in ${Math.round(delay)}ms...`)
        await this.sleep(delay)
      }
    }

    // Throw the last error with enhanced context
    throw new OpenAIError(lastError, retryCount)
  }

  async createVectorStore(params: any, userId?: string): Promise<any> {
    this.ensureInitialized()
    return this.executeWithRetry(() => this.client!.beta.vectorStores.create(params), "createVectorStore", userId)
  }

  async createFileBatch(vectorStoreId: string, params: any, userId?: string): Promise<any> {
    this.ensureInitialized()
    return this.executeWithRetry(
      () => this.client!.beta.vectorStores.fileBatches.create(vectorStoreId, params),
      "createFileBatch",
      userId,
    )
  }

  async deleteVectorStore(vectorStoreId: string, userId?: string): Promise<any> {
    this.ensureInitialized()
    return this.executeWithRetry(() => this.client!.beta.vectorStores.del(vectorStoreId), "deleteVectorStore", userId)
  }

  async createFile(params: any, userId?: string): Promise<any> {
    this.ensureInitialized()
    return this.executeWithRetry(() => this.client!.files.create(params), "createFile", userId)
  }

  async retrieveVectorStore(vectorStoreId: string, userId?: string): Promise<any> {
    this.ensureInitialized()
    return this.executeWithRetry(
      () => this.client!.beta.vectorStores.retrieve(vectorStoreId),
      "retrieveVectorStore",
      userId,
    )
  }

  private async executeWithRetry(operation: () => Promise<any>, operationType: string, userId?: string): Promise<any> {
    const startTime = Date.now()
    let lastError: any
    let retryCount = 0

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`[v0] ${operationType} attempt ${attempt + 1}/${this.maxRetries + 1}`)
        const result = await operation()
        const duration = Date.now() - startTime
        console.log(`[v0] ${operationType} completed successfully in ${duration}ms`)
        return result
      } catch (error: any) {
        lastError = error
        retryCount = attempt
        console.log(`[v0] ${operationType} failed on attempt ${attempt + 1}: ${error.message}`)

        if (attempt === this.maxRetries) break
        if (!this.shouldRetry(error)) break

        const delay = this.calculateBackoffDelay(attempt)
        console.log(`[v0] Retrying ${operationType} in ${Math.round(delay)}ms...`)
        await this.sleep(delay)
      }
    }

    throw new OpenAIError(lastError, retryCount)
  }
}

class OpenAIError extends Error {
  public status: number
  public retryCount: number
  public isRetryable: boolean
  public userMessage: string

  constructor(originalError: any, retryCount: number) {
    super(originalError?.message || "OpenAI API request failed")
    this.name = "OpenAIError"
    this.status = originalError?.status || 500
    this.retryCount = retryCount
    this.isRetryable = this.shouldRetry(originalError)
    this.userMessage = this.generateUserMessage(originalError)
  }

  private shouldRetry(error: any): boolean {
    if (error?.status === 429) return true
    if (error?.status >= 500 && error?.status < 600) return true
    if (error?.code === "ECONNRESET" || error?.code === "ETIMEDOUT") return true
    return false
  }

  private generateUserMessage(error: any): string {
    if (error?.status === 429) {
      return "We're experiencing high demand. Please try again in a few moments."
    }
    if (error?.status === 401) {
      return "Authentication error. Please contact support."
    }
    if (error?.status === 403) {
      return "Access denied. Please check your permissions."
    }
    if (error?.status >= 500) {
      return "Our AI service is temporarily unavailable. Please try again."
    }
    if (error?.code === "ETIMEDOUT") {
      return "Request timed out. Please try again with a shorter document or fewer files."
    }
    if (error?.message?.includes("context_length_exceeded")) {
      return "Document is too long. Please reduce the content or number of files."
    }
    return "An unexpected error occurred. Please try again."
  }
}

// Export singleton instance
export const robustOpenAI = new RobustOpenAIClient()
export { OpenAIError }
