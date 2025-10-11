-- Migration para adicionar campo metadata na tabela UserTip
-- Executar este script para atualizar o banco de dados existente

-- Adicionar coluna metadata (JSON) na tabela UserTip
ALTER TABLE "UserTip" ADD COLUMN "metadata" JSONB;

-- Criar índice composto para melhor performance nas consultas por data
CREATE INDEX IF NOT EXISTS "UserTip_userId_createdAt_idx" ON "UserTip"("userId", "createdAt");

-- Atualizar registros existentes com metadata padrão
UPDATE "UserTip" 
SET "metadata" = jsonb_build_object(
  'batchId', CONCAT("userId", '-', DATE("createdAt")),
  'generatedAt', "createdAt"::text,
  'version', '1.0',
  'migrated', true
)
WHERE "metadata" IS NULL;

-- Comentários para documentação
COMMENT ON COLUMN "UserTip"."metadata" IS 'Metadados para controle de versão e batch das dicas';
COMMENT ON INDEX "UserTip_userId_createdAt_idx" IS 'Índice composto para otimizar consultas por usuário e data';
