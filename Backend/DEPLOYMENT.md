# Deployment & Setup Guide

## Quick Start

### Prerequisites
- Node.js 18+
- MySQL 5.7+
- npm or yarn

### Local Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   # Copy the example file
   cp .env.example .env
   
   # Edit .env with your configuration
   # Minimum required:
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=asset_buddy
   PORT=5000
   ```

3. **Create MySQL Database**
   ```bash
   mysql -u root -p -e "CREATE DATABASE asset_buddy;"
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```
   
   The server will start on `http://localhost:5000`

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_HOST` | MySQL server host | `localhost` |
| `DB_USER` | MySQL username | `root` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_NAME` | Database name | `asset_buddy` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` or `production` |
| `JWT_SECRET` | Secret key for JWT tokens | `your-secret-key` |
| `JWT_EXPIRE` | JWT expiration time | `7d` |

## Build & Production

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder with compiled JavaScript files.

### Run Production Build
```bash
npm start
```

### Using PM2 (Recommended for Production)
```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start dist/index.js --name "asset-buddy-api"

# View logs
pm2 logs asset-buddy-api

# Restart
pm2 restart asset-buddy-api
```

## Database Setup

### Manual Schema Creation

If you need to manually create the database schema:

1. **Connect to MySQL**
   ```bash
   mysql -u root -p
   ```

2. **Create Database**
   ```sql
   CREATE DATABASE asset_buddy;
   USE asset_buddy;
   ```

3. **The app will automatically initialize the schema on first run**

### Schema Overview

The application automatically creates the following tables:
- `users` - User accounts
- `laptops` - Laptop inventory
- `staff` - Employee information
- `assignments` - Laptop-to-staff assignments
- `issues` - Hardware issues and maintenance tracking
- `reports` - Generated reports

## Docker Deployment

### Using Docker

Create a `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY dist ./dist

EXPOSE 5000

CMD ["node", "dist/index.js"]
```

### Build Docker Image
```bash
docker build -t asset-buddy-api:latest .
```

### Run Docker Container
```bash
docker run -d \
  --name asset-buddy-api \
  -p 5000:5000 \
  -e DB_HOST=mysql \
  -e DB_USER=asset_buddy \
  -e DB_PASSWORD=secure_password \
  -e DB_NAME=asset_buddy \
  asset-buddy-api:latest
```

### Docker Compose

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: asset_buddy
      MYSQL_USER: asset_buddy
      MYSQL_PASSWORD: secure_password
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      timeout: 20s
      retries: 10

  api:
    build: .
    ports:
      - "5000:5000"
    environment:
      DB_HOST: mysql
      DB_USER: asset_buddy
      DB_PASSWORD: secure_password
      DB_NAME: asset_buddy
      NODE_ENV: production
      PORT: 5000
    depends_on:
      mysql:
        condition: service_healthy

volumes:
  mysql_data:
```

Run with Docker Compose:
```bash
docker-compose up -d
```

## Deployment Platforms

### Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku App**
   ```bash
   heroku create asset-buddy-api
   ```

4. **Add PostgreSQL Add-on**
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Railway Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   railway init
   ```

4. **Add PostgreSQL Plugin**
   - Go to Railway dashboard
   - Click "Create New" and select "PostgreSQL"

5. **Deploy**
   ```bash
   railway up
   ```

### AWS Deployment

1. **Using Elastic Beanstalk**
   ```bash
   # Install EB CLI
   pip install awsebcli
   
   # Initialize
   eb init -p node.js-18 asset-buddy-api
   
   # Create environment
   eb create asset-buddy-api-env
   
   # Deploy
   eb deploy
   ```

2. **Set Environment Variables**
   ```bash
   eb setenv DATABASE_URL=your_rds_connection_string
   ```

## Monitoring & Logging

### View Logs Locally
```bash
npm run dev
# Logs will be printed to console
```

### Using Morgan for HTTP Logging
The app already includes request logging middleware that logs all incoming requests.

### Health Check
Monitor server health:
```bash
curl http://localhost:5000/api/health
```

## Backup & Restore

### Backup PostgreSQL Database
```bash
pg_dump -U postgres -h localhost asset_buddy > backup.sql
```

### Restore PostgreSQL Database
```bash
psql -U postgres -h localhost asset_buddy < backup.sql
```

## Maintenance

### Update Dependencies
```bash
npm update
```

### Check for Vulnerabilities
```bash
npm audit
# Fix vulnerabilities
npm audit fix
```

### Clear Build Files
```bash
npm run clean
# or
rm -rf dist/
```

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists and is accessible

### Port Already in Use
```bash
# Change PORT in .env to a different value
# Or kill process using the port
lsof -i :5000
kill -9 <PID>
```

### Module Not Found Errors
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### TypeScript Compilation Errors
```bash
# Clean build and rebuild
npm run build
```

## Performance Optimization

1. **Connection Pooling**: Already enabled with pg Pool
2. **Caching**: Consider adding Redis for frequently accessed data
3. **Database Indexing**: Add indexes on frequently queried columns
4. **Compression**: Enable gzip compression in production

## Security Checklist

- [ ] Set strong JWT_SECRET in production
- [ ] Use HTTPS in production
- [ ] Implement API rate limiting
- [ ] Add authentication/authorization
- [ ] Validate all user inputs (already using Zod)
- [ ] Use environment variables for secrets
- [ ] Enable CORS properly for production
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Scaling Strategies

1. **Horizontal Scaling**: Run multiple instances behind a load balancer
2. **Database Read Replicas**: For read-heavy operations
3. **Caching Layer**: Add Redis for frequently accessed data
4. **API Gateway**: Use AWS API Gateway or similar for rate limiting
5. **Microservices**: Split into separate services if needed

## Next Steps

1. Implement JWT authentication
2. Add role-based access control
3. Implement request validation middleware
4. Add comprehensive logging
5. Set up CI/CD pipeline
6. Add automated tests
7. Implement API documentation with Swagger/OpenAPI
