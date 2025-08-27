# TsachalGPT Admin User Guide

## 1. Introduction

TsachalGPT is a comprehensive AI-powered document generation platform designed for creating professional business documents including proposals, bids, audit reports, marine surveys, and engineering reports. The application leverages OpenAI's advanced language models to generate structured, high-quality documents based on user input and uploaded reference materials.

### Key Features:
- **Multi-format Document Generation**: Proposals, audits (ISO 9001/14001/45001), marine surveys, engineering reports, and HR policies
- **AI-Powered Content Creation**: Uses OpenAI GPT-4 with structured JSON schemas for consistent output
- **File Context Integration**: Upload reference documents to enhance generation quality
- **Quality Assurance**: Automated QA scoring with gap identification and auto-fix capabilities
- **Professional Export**: High-quality PDF and DOCX export with proper formatting
- **Role-Based Access Control**: Admin, Manager, Auditor, and User roles with granular permissions
- **Real-time Analytics**: Dashboard telemetry with usage metrics and activity tracking

## 2. Getting Started

### Admin Login Credentials
Use the following credentials to access the admin interface:

**Admin Account:**
- Email: `admin@test.com`
- Password: `admin123`

### Initial Setup Steps:
1. Navigate to the application URL
2. Click "Sign In" or go to `/auth/login`
3. Enter the admin credentials above
4. Upon successful login, you'll be redirected to the main dashboard

### First-Time Setup:
- Ensure all database tables are properly created by running the SQL scripts
- Verify that sample users are created for testing different role permissions
- Check that environment variables are properly configured

## 3. Navigating the Dashboard

The TsachalGPT dashboard is organized into several key sections:

### Main Navigation Tabs:
- **Dashboard**: Overview with metrics and recent activity
- **Generate**: Document creation interface
- **Library**: Document management and history
- **Admin** (Admin only): User management and system administration

### Dashboard Sections:

#### Telemetry Cards:
- **Documents Created**: Total number of documents generated
- **This Month**: Documents created in the current month
- **Average Generation Time**: Mean time for document generation
- **Success Rate**: Percentage of successful generations

#### Document Templates:
- Quick access to different document types
- Shows document counts by category
- Direct links to generation interface

#### Recent Activity:
- Last 20 document generations across all users
- Shows document type, creator, timestamp, and status
- Real-time updates as new documents are generated

### Sidebar Navigation:
- **Document Types**: Quick access to specific document generators
- **Knowledge Base** (Admin): Manage reference documents and templates
- **User Management** (Admin): Create and manage user accounts

## 4. Generating Documents

### Step-by-Step Document Generation:

#### Configuration Tab:
1. **Select Document Type**: Choose from Proposal, Audit, Marine Survey, Engineering Report, or HR Policy
2. **Enter Basic Information**:
   - Document title
   - Client/organization name
   - Project description
   - Specific requirements or focus areas
3. **Set Visibility**: Choose Private, Organization, or Public access level

#### Upload Tab:
1. **Upload Reference Files**: Drag and drop or click to select files
   - Supported formats: PDF, DOC, DOCX, TXT, CSV
   - Multiple files can be uploaded simultaneously
2. **Create Vector Store** (Optional): Enable for enhanced context-aware generation
3. **Monitor Upload Progress**: Real-time progress indicators and status updates

#### Generate Tab:
1. **Review Configuration**: Verify all settings and uploaded files
2. **Click "Generate Document"**: Initiate the AI generation process
3. **Monitor Progress**: Real-time generation status and estimated completion time
4. **Quality Assurance**: Automatic QA scoring and gap identification

#### Preview & Export Tab:
1. **Review Generated Content**: Full document preview with formatting
2. **QA Results**: View quality score and identified gaps
3. **Apply Fixes** (if available): Automatically apply suggested improvements
4. **Export Options**:
   - **PDF Export**: Professional PDF with cover page, TOC, and proper formatting
   - **DOCX Export**: Editable Word document with styles and structure

### Advanced Features:

#### Document Templates:
- Pre-configured templates for common document types
- Industry-specific formatting and structure
- Customizable sections and requirements

#### File Context Integration:
- Uploaded files are processed and indexed for context
- AI references relevant information from uploaded documents
- Citations and source attribution in generated content

## 5. Managing Documents

### Document Library Features:

#### Viewing Documents:
- **List View**: Tabular display with sorting and filtering options
- **Card View**: Visual preview with document thumbnails
- **Search Functionality**: Full-text search across document titles and content
- **Filter Options**: By document type, date range, creator, or status

#### Document Actions:
- **View**: Open document in preview mode
- **Edit**: Modify document metadata and settings
- **Download**: Export in PDF or DOCX format
- **Delete**: Remove document (with confirmation)
- **Share**: Adjust visibility settings and permissions

#### Admin-Specific Capabilities:
- **View All Documents**: Access to all user-generated content regardless of ownership
- **Bulk Operations**: Select multiple documents for batch actions
- **User Document Management**: View and manage documents by specific users
- **System-wide Statistics**: Comprehensive analytics across all users

### Document Metadata:
- Creation date and time
- Document type and category
- Owner information
- File size and word count
- QA score and status
- Last modified timestamp

## 6. Viewing Telemetry Data

### Dashboard Analytics:

#### Real-time Metrics:
- **Generation Count**: Total documents created
- **Monthly Statistics**: Current month's activity
- **Performance Metrics**: Average generation times and success rates
- **User Activity**: Active users and engagement levels

#### Detailed Telemetry:
Access comprehensive telemetry data through the admin interface:

1. **Navigate to Admin Section**
2. **Select "Analytics" or "Telemetry"**
3. **View Detailed Reports**:
   - Token usage statistics
   - Generation duration analysis
   - Error rates and failure patterns
   - User behavior analytics

#### Telemetry Data Points:
- **Document Type**: Category of generated document
- **Created By**: User who initiated generation
- **Created At**: Timestamp of generation
- **Tokens In/Out**: OpenAI API token usage
- **Duration**: Time taken for generation
- **QA Score**: Quality assessment score
- **Status**: Success/failure status

### Interpreting Analytics:
- **High Token Usage**: May indicate complex documents or extensive reference materials
- **Long Generation Times**: Could suggest system performance issues or complex requests
- **Low QA Scores**: May require template improvements or user guidance
- **Error Patterns**: Help identify system issues or user experience problems

## 7. Testing User Permissions

### Row Level Security (RLS) Testing:

#### Test Scenarios:

**Scenario 1: Non-Admin User Access**
1. Log out of admin account
2. Log in as a regular user (user1@test.com / user123)
3. Attempt to access admin routes (`/admin/users`)
4. **Expected Result**: Access denied, redirect to dashboard

**Scenario 2: Document Ownership**
1. Generate a document as User A
2. Log out and log in as User B
3. Navigate to Document Library
4. **Expected Result**: User B cannot see User A's private documents

**Scenario 3: Organization-Level Sharing**
1. Create a document with "Organization" visibility as User A
2. Log in as User B from the same organization
3. Check Document Library
4. **Expected Result**: User B can view the organization-shared document

**Scenario 4: Admin Override**
1. Log in as admin
2. Navigate to Document Library
3. **Expected Result**: Admin can view all documents regardless of ownership

#### Permission Testing Checklist:
- [ ] Non-admin users cannot access `/admin/*` routes
- [ ] Users can only view their own private documents
- [ ] Organization documents are visible to same-organization users
- [ ] Public documents are visible to all users
- [ ] Admin users can view all documents
- [ ] Document creation is properly attributed to the logged-in user
- [ ] Telemetry data respects user permissions

### API Endpoint Testing:
Test API endpoints with different user roles:
- `/api/documents` - Should return user-specific documents
- `/api/telemetry` - Should respect user permissions
- `/api/admin/*` - Should require admin privileges

## 8. Troubleshooting

### Common Issues and Solutions:

#### Authentication Problems:

**Issue**: Cannot log in with provided credentials
**Solutions**:
1. Verify that sample users have been created in Supabase
2. Check that Supabase environment variables are correctly configured
3. Ensure RLS policies are not blocking authentication
4. Try the user creation API endpoint: `/api/setup/create-sample-users`

**Issue**: Session expires quickly
**Solutions**:
1. Check Supabase session configuration
2. Verify middleware is properly handling session refresh
3. Ensure cookies are being set correctly

#### Document Generation Issues:

**Issue**: Generation fails with timeout errors
**Solutions**:
1. Verify OpenAI API key is valid and has sufficient credits
2. Check network connectivity
3. Reduce document complexity or file upload size
4. Monitor OpenAI API status

**Issue**: Poor document quality or irrelevant content
**Solutions**:
1. Improve input descriptions and requirements
2. Upload more relevant reference documents
3. Use specific document templates
4. Check QA feedback for improvement suggestions

#### Database and RLS Issues:

**Issue**: "Infinite recursion detected in policy" errors
**Solutions**:
1. Simplify database queries to avoid complex joins
2. Review RLS policies for circular references
3. Use separate queries instead of complex joins
4. Check policy definitions in Supabase dashboard

**Issue**: Users can see documents they shouldn't access
**Solutions**:
1. Verify RLS policies are enabled on all tables
2. Check policy definitions for correct user filtering
3. Test with different user roles
4. Review document visibility settings

#### Performance Issues:

**Issue**: Slow dashboard loading
**Solutions**:
1. Check database query performance
2. Implement pagination for large datasets
3. Add database indexes for frequently queried columns
4. Monitor Supabase performance metrics

**Issue**: File upload failures
**Solutions**:
1. Check file size limits
2. Verify supported file formats
3. Test network connectivity
4. Check OpenAI file upload API status

### Debug Mode:
Enable debug logging by adding console.log statements in the code to track:
- API request/response cycles
- Authentication state changes
- Database query execution
- File upload progress

## 9. Feedback and Reporting

### Testing Feedback Categories:

#### Functionality Testing:
- Document generation accuracy and quality
- Export functionality (PDF/DOCX formatting)
- File upload and processing
- User authentication and permissions
- Dashboard analytics and telemetry

#### User Experience Testing:
- Interface responsiveness and usability
- Navigation flow and accessibility
- Error message clarity
- Loading states and feedback
- Mobile compatibility

#### Performance Testing:
- Document generation speed
- File upload performance
- Dashboard loading times
- Database query efficiency
- Concurrent user handling

### Bug Reporting Template:

**Bug Report Format:**
\`\`\`
Title: [Brief description of the issue]

Environment:
- Browser: [Chrome/Firefox/Safari/Edge]
- User Role: [Admin/Manager/Auditor/User]
- Document Type: [If applicable]

Steps to Reproduce:
1. [First step]
2. [Second step]
3. [Third step]

Expected Behavior:
[What should happen]

Actual Behavior:
[What actually happened]

Screenshots/Logs:
[Attach relevant screenshots or error logs]

Additional Context:
[Any other relevant information]
\`\`\`

### Feedback Submission:
- Document all issues with detailed steps to reproduce
- Include screenshots or screen recordings when possible
- Note the specific user role and permissions when the issue occurred
- Test issues across different browsers and devices
- Provide suggestions for improvements or alternative approaches

### Priority Levels:
- **Critical**: Application crashes, security vulnerabilities, data loss
- **High**: Core functionality broken, major user experience issues
- **Medium**: Minor functionality issues, cosmetic problems
- **Low**: Enhancement requests, nice-to-have features

### Contact Information:
Submit feedback and bug reports through:
- GitHub Issues (if repository access is available)
- Email to the development team
- Internal bug tracking system
- Direct communication with project stakeholders

---

## Additional Resources

### Useful Links:
- Supabase Dashboard: [Your Supabase project URL]
- OpenAI API Documentation: https://platform.openai.com/docs
- Next.js Documentation: https://nextjs.org/docs

### Support Contacts:
- Technical Support: [Contact information]
- Project Manager: [Contact information]
- Development Team: [Contact information]

### Version Information:
- Application Version: 1.0.0
- Last Updated: [Current date]
- Next.js Version: 15.1.3
- Supabase Integration: v2.39.0
