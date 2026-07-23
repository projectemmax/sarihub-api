## [0.7.0]

### Added

- nestjs-pino integration
- Structured HTTP request logging
- UUID-based Request Correlation IDs
- Request ID middleware
- X-Request-ID response header
- Environment-aware logger configuration

### Changed

- Replaced NestJS default logger with Pino
- Customized HTTP request log serialization
- Simplified logged request and response metadata
- Improved logging configuration for development and production

### Fixed

- Removed sensitive headers from logs (Authorization, Cookie, Set-Cookie)
- Prevented exposure of request and response headers in log output
- Improved request traceability across the application

## [0.6.0]

### Added

- Product Response DTO
- ProductResponseMapper
- CloudinaryModule
- Variant Image Upload API
- Temporary Image Upload API
- Category Variant Template support

### Changed

- Refactored Product API responses
- Improved image response structure
- Centralized Cloudinary integration

### Fixed

- Duplicate Variant SKU generation
- Product response consistency