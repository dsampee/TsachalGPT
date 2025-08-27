// Mock implementation of class-variance-authority for testing
export function cva(base: string, config?: any) {
  return (props?: any) => {
    let classes = base

    if (config?.variants && props) {
      Object.keys(config.variants).forEach((key) => {
        const variant = props[key]
        if (variant && config.variants[key][variant]) {
          classes += " " + config.variants[key][variant]
        }
      })
    }

    if (config?.defaultVariants) {
      Object.keys(config.defaultVariants).forEach((key) => {
        if (!props || props[key] === undefined) {
          const defaultVariant = config.defaultVariants[key]
          if (config.variants[key][defaultVariant]) {
            classes += " " + config.variants[key][defaultVariant]
          }
        }
      })
    }

    return classes
  }
}

export type VariantProps<T> = T extends (...args: any[]) => any ? Parameters<T>[0] : never
