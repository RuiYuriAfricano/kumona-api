# Kumona Vision Care API

API RESTful para o aplicativo Kumona Vision Care, uma solução de saúde ocular com diagnóstico por IA.

<p align="center">
  <img src="https://via.placeholder.com/200x200.png?text=Kumona+Vision" alt="Kumona Vision Care Logo" width="200" />
</p>

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Tecnologias](#tecnologias)
- [Requisitos](#requisitos)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Uso](#uso)
- [Endpoints da API](#endpoints-da-api)
- [Banco de Dados](#banco-de-dados)
- [Testes](#testes)
- [Implantação](#implantação)
- [Contribuição](#contribuição)
- [Licença](#licença)

## 🔍 Visão Geral

O Kumona Vision Care é um aplicativo de saúde ocular que utiliza inteligência artificial para diagnóstico de condições oculares através de imagens. Esta API fornece todos os endpoints necessários para suportar o aplicativo, incluindo autenticação de usuários, análise de imagens, recomendações personalizadas e acompanhamento de progresso.

### Principais Funcionalidades

- Autenticação segura com JWT
- Upload e análise de imagens oculares
- Diagnóstico de condições oculares com IA
- Recomendações personalizadas
- Rastreamento de atividades de prevenção
- Estatísticas e gráficos de progresso
- Suporte a múltiplos idiomas

## 🏗️ Arquitetura

O projeto segue uma arquitetura modular baseada no framework NestJS, que implementa os princípios SOLID e utiliza injeção de dependência. A estrutura do projeto é organizada da seguinte forma:

```
kumona-api/
├── src/
│   ├── ai/                  # Módulo de integração com IA
│   ├── auth/                # Módulo de autenticação
│   ├── config/              # Configurações da aplicação
│   ├── diagnosis/           # Módulo de diagnóstico ocular
│   ├── prevention/          # Módulo de prevenção e recomendações
│   ├── prisma/              # Serviço e configuração do Prisma ORM
│   ├── progress/            # Módulo de acompanhamento de progresso
│   ├── user/                # Módulo de gerenciamento de usuários
│   ├── app.module.ts        # Módulo principal da aplicação
│   └── main.ts              # Ponto de entrada da aplicação
├── prisma/                  # Schema e migrações do banco de dados
│   ├── migrations/          # Migrações do banco de dados
│   └── schema.prisma        # Definição do schema do banco de dados
├── test/                    # Testes de integração
├── Dockerfile               # Configuração para containerização
└── package.json             # Dependências e scripts
```

Cada módulo segue uma estrutura consistente:
- **Controller**: Responsável por receber as requisições HTTP
- **Service**: Contém a lógica de negócio
- **DTO**: Objetos de transferência de dados para validação
- **Entities/Models**: Representações dos modelos de dados
- **Guards/Interceptors**: Middleware para autenticação e transformação de dados

## 🛠️ Tecnologias

- [NestJS](https://nestjs.com/) - Framework para construção de aplicações server-side eficientes e escaláveis
- [Prisma](https://www.prisma.io/) - ORM para acesso ao banco de dados
- [PostgreSQL](https://www.postgresql.org/) - Banco de dados relacional
- [JWT](https://jwt.io/) - JSON Web Tokens para autenticação
- [Swagger](https://swagger.io/) - Documentação da API
- [Jest](https://jestjs.io/) - Framework de testes
- [Docker](https://www.docker.com/) - Containerização
- [GitHub Actions](https://github.com/features/actions) - CI/CD
- [Bcrypt](https://www.npmjs.com/package/bcrypt) - Criptografia de senhas
- [Multer](https://www.npmjs.com/package/multer) - Middleware para upload de arquivos
- [Axios](https://www.npmjs.com/package/axios) - Cliente HTTP para integração com serviços externos

## 📋 Requisitos

- Node.js (v18 ou superior)
- npm (v8 ou superior)
- PostgreSQL (v14 ou superior)
- Docker (opcional, para containerização)

## 🚀 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/kumona-api.git
cd kumona-api
```

2. Instale as dependências:

```bash
npm install
```

3. Crie um arquivo `.env` baseado no `.env.example`:

```bash
cp .env.example .env
```

4. Configure as variáveis de ambiente no arquivo `.env` (veja a seção [Configuração](#configuração)).

5. Execute as migrações do banco de dados:

```bash
npx prisma migrate dev
```

6. Inicie o servidor de desenvolvimento:

```bash
npm run start:dev
```

## ⚙️ Configuração

Configure as seguintes variáveis de ambiente no arquivo `.env`:

```
# Configuração do Banco de Dados
DATABASE_URL=postgresql://username:password@hostname:port/database

# Configuração JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=24h

# Configuração do Servidor
PORT=3000
NODE_ENV=development

# Configuração de Serviço de IA
AI_SERVICE_URL=https://api.example.com/vision
AI_SERVICE_API_KEY=your-api-key-here

# Configuração de Email (opcional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your-password
EMAIL_FROM=noreply@kumonavision.com

# Configuração de SMS (opcional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

## 📝 Uso

### Iniciar o servidor

```bash
# Desenvolvimento
npm run start:dev

# Modo debug
npm run start:debug

# Produção
npm run build
npm run start:prod
```

### Acessar a documentação da API

Após iniciar o servidor, acesse a documentação Swagger em:

```
http://localhost:3000/api
```

A documentação Swagger fornece uma interface interativa para testar todos os endpoints da API.

## 🔌 Endpoints da API

### Autenticação

- `POST /auth/register` - Registro de novos usuários
  - Corpo: `{ "name": "string", "email": "string", "password": "string", "birthDate": "string" }`
  - Resposta: `{ "user": {...}, "token": "string" }`

- `POST /auth/login` - Login de usuários
  - Corpo: `{ "email": "string", "password": "string" }`
  - Resposta: `{ "user": {...}, "token": "string" }`

### Usuários

- `GET /users/profile` - Obter perfil do usuário atual
  - Cabeçalho: `Authorization: Bearer {token}`
  - Resposta: `{ "id": number, "name": "string", "email": "string", ... }`

- `PUT /users/profile` - Atualizar perfil do usuário
  - Cabeçalho: `Authorization: Bearer {token}`
  - Corpo: `{ "name": "string", "about": "string", "phone": "string", ... }`
  - Resposta: `{ "id": number, "name": "string", ... }`

- `PATCH /users/profile-image` - Atualizar imagem de perfil
  - Cabeçalho: `Authorization: Bearer {token}`
  - Corpo: `FormData com campo "image"`
  - Resposta: `{ "profileImage": "string" }`

### Diagnóstico

- `POST /diagnosis/analyze` - Enviar imagem para análise
  - Cabeçalho: `Authorization: Bearer {token}`
  - Corpo: `FormData com campo "image"`
  - Resposta: `{ "id": number, "condition": "string", "severity": "string", ... }`

- `GET /diagnosis/history` - Obter histórico de diagnósticos
  - Cabeçalho: `Authorization: Bearer {token}`
  - Parâmetros: `?limit=10&page=1&startDate=2023-01-01&endDate=2023-12-31`
  - Resposta: `{ "data": [...], "meta": { "total": number, "page": number, ... } }`

- `GET /diagnosis/:id` - Obter detalhes de um diagnóstico específico
  - Cabeçalho: `Authorization: Bearer {token}`
  - Resposta: `{ "id": number, "condition": "string", "severity": "string", ... }`

### Prevenção

- `GET /prevention/tips` - Obter dicas de prevenção
  - Cabeçalho: `Authorization: Bearer {token}`
  - Parâmetros: `?category=string&limit=10`
  - Resposta: `[{ "id": number, "title": "string", "content": "string", ... }]`

- `GET /prevention/exercises` - Obter exercícios oculares recomendados
  - Cabeçalho: `Authorization: Bearer {token}`
  - Resposta: `[{ "id": number, "title": "string", "description": "string", ... }]`

- `POST /prevention/track` - Registrar atividade de prevenção
  - Cabeçalho: `Authorization: Bearer {token}`
  - Corpo: `{ "activityType": "string", "duration": number, ... }`
  - Resposta: `{ "id": number, "activityType": "string", ... }`

- `GET /prevention/activities` - Obter atividades do usuário
  - Cabeçalho: `Authorization: Bearer {token}`
  - Parâmetros: `?startDate=2023-01-01&endDate=2023-12-31`
  - Resposta: `[{ "id": number, "activityType": "string", "date": "string", ... }]`

### Progresso

- `GET /progress/summary` - Obter resumo do progresso
  - Cabeçalho: `Authorization: Bearer {token}`
  - Resposta: `{ "diagnosisCount": number, "activitiesCount": number, ... }`

- `GET /progress/charts` - Obter dados para gráficos de progresso
  - Cabeçalho: `Authorization: Bearer {token}`
  - Parâmetros: `?period=week|month|year`
  - Resposta: `{ "labels": [...], "datasets": [...] }`

## 💾 Banco de Dados

O projeto utiliza o Prisma como ORM para interagir com o banco de dados PostgreSQL. O schema do banco de dados está definido em `prisma/schema.prisma`.

### Modelos Principais

- `User` - Informações do usuário (id, name, email, password, birthDate, about, phone, profileImage)
- `MedicalHistory` - Histórico médico do usuário (existingConditions, familyHistory, medications)
- `UserPreferences` - Preferências do usuário (notificationsEnabled, reminderFrequency, language)
- `Diagnosis` - Diagnósticos realizados (condition, severity, score, description, recommendations, imageUrl)
- `EyeImage` - Imagens oculares enviadas pelos usuários (url, type, diagnosisId)
- `PreventionActivity` - Atividades de prevenção registradas (activityType, duration, date)
- `PreventionTip` - Dicas de prevenção (title, content, category)
- `EyeExercise` - Exercícios oculares (title, description, steps, duration, imageUrl)

### Comandos Úteis do Prisma

```bash
# Gerar cliente Prisma
npx prisma generate

# Criar migração
npx prisma migrate dev --name nome_da_migracao

# Aplicar migrações em produção
npx prisma migrate deploy

# Visualizar banco de dados
npx prisma studio
```

## 🧪 Testes

O projeto utiliza Jest para testes unitários e de integração.

### Executar testes unitários

```bash
npm test

# Modo watch
npm run test:watch
```

### Executar testes de integração

```bash
npm run test:e2e
```

### Verificar cobertura de testes

```bash
npm run test:cov
```

## 🚢 Implantação

### Usando Docker

1. Construa a imagem Docker:

```bash
docker build -t kumona-api .
```

2. Execute o contêiner:

```bash
docker run -p 3000:3000 --env-file .env kumona-api
```

### CI/CD com GitHub Actions

O projeto inclui um workflow de GitHub Actions para:

1. Executar testes automaticamente em cada pull request
2. Construir e publicar a imagem Docker quando o código é mesclado na branch principal
3. Implantar automaticamente em um ambiente de produção

O arquivo de configuração do GitHub Actions está localizado em `.github/workflows/main.yml`.

## 👥 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### Padrões de Código

- Siga as convenções de nomenclatura do NestJS
- Escreva testes para novas funcionalidades
- Documente novos endpoints com anotações Swagger
- Mantenha a cobertura de testes acima de 80%

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
