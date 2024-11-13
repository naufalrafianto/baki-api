## Cara Memulai

1. Clone repository:

```bash
git clone <repository-url>
cd exercise-tracking-api
```

2. Buat file environment:

```bash
cp .env.example .env
```

Update file `.env` dengan konfigurasi Anda:

```env
# Database
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=mydatabase

# JWT
JWT_SECRET=your-super-secret-key

# Node
NODE_ENV=development
```

3. Jalankan aplikasi:

```bash
# Jalankan aplikasi
yarn docker:up

# Jalankan migrasi
yarn prisma:migrate

# Jalankan migrasi
yarn prisma:seed

# Generate Prisma Client
yarn prisma:generate

# Buka Prisma Studio
yarn prisma:studio
```

### Mengakses Layanan

- API: http://localhost:3000
- Prisma Studio: http://localhost:5555
- PostgreSQL: localhost:5432
- Redis: localhost:6379
