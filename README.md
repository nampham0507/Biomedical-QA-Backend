# BioMedQA — Backend API

Node.js + Express + TypeScript REST API for BioMedQA system.

## Setup

```bash
cp .env.example .env

# Điền các giá trị vào .env

npm install
npm run dev
```

## With Docker

```bash
docker compose up -d
npm run seed
```

## Default Accounts

| Role  | Email                                                   | Password    |
| ----- | ------------------------------------------------------- | ----------- |
| Admin | [admin@biomedicalqa.com](mailto:admin@biomedicalqa.com) | Admin@12345 |
| User  | [demo@biomedicalqa.com](mailto:demo@biomedicalqa.com)   | Demo@12345  |
