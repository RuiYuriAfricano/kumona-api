# Kumona Vision Care API

API RESTful para o aplicativo Kumona Vision Care, uma solução de saúde ocular com diagnóstico por IA.

<p align="center">
  <img src="https://via.placeholder.com/200x200.png?text=Kumona+Vision" alt="Kumona Vision Care Logo" width="200" />
</p>

## 📋 Índice

- [Visão Geral](#visão-geral)
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

## 🛠️ Tecnologias

- [NestJS](https://nestjs.com/) - Framework para construção de aplicações server-side eficientes e escaláveis
- [Prisma](https://www.prisma.io/) - ORM para acesso ao banco de dados
- [PostgreSQL](https://www.postgresql.org/) - Banco de dados relacional
- [JWT](https://jwt.io/) - JSON Web Tokens para autenticação
- [Swagger](https://swagger.io/) - Documentação da API
- [Jest](https://jestjs.io/) - Framework de testes
- [Docker](https://www.docker.com/) - Containerização
- [GitHub Actions](https://github.com/features/actions) - CI/CD

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

# Configuração de Serviço de IA (para integração futura)
AI_SERVICE_URL=https://api.example.com/vision
AI_SERVICE_API_KEY=your-api-key-here
```

## 📝 Uso

### Iniciar o servidor

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

### Acessar a documentação da API

Após iniciar o servidor, acesse a documentação Swagger em:

```
http://localhost:3000/api
```

## 🔌 Endpoints da API

### Autenticação

- `POST /auth/register` - Registro de novos usuários
- `POST /auth/login` - Login de usuários

### Usuários

- `GET /users/profile` - Obter perfil do usuário
- `PUT /users/profile` - Atualizar perfil do usuário

### Diagnóstico

- `POST /diagnosis/analyze` - Enviar imagem para análise
- `GET /diagnosis/history` - Obter histórico de diagnósticos
- `GET /diagnosis/:id` - Obter detalhes de um diagnóstico específico

### Prevenção

- `GET /prevention/tips` - Obter dicas de prevenção
- `GET /prevention/exercises` - Obter exercícios oculares recomendados
- `POST /prevention/track` - Registrar atividade de prevenção
- `GET /prevention/activities` - Obter atividades do usuário

### Progresso

- `GET /progress/summary` - Obter resumo do progresso
- `GET /progress/charts` - Obter dados para gráficos de progresso

## 💾 Banco de Dados

O projeto utiliza o Prisma como ORM para interagir com o banco de dados PostgreSQL. O schema do banco de dados está definido em `prisma/schema.prisma`.

### Modelos Principais

- `User` - Informações do usuário
- `MedicalHistory` - Histórico médico do usuário
- `UserPreferences` - Preferências do usuário
- `Diagnosis` - Diagnósticos realizados
- `PreventionActivity` - Atividades de prevenção registradas
- `PreventionTip` - Dicas de prevenção
- `EyeExercise` - Exercícios oculares

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

### Executar testes unitários

```bash
npm test
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

## 👥 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das suas alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.
