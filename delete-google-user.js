const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteGoogleUser() {
  try {
    console.log('🔍 Procurando usuários do Google...\n');

    // Encontrar usuários do Google (senha vazia)
    const googleUsers = await prisma.user.findMany({
      where: {
        password: '',
        deleted: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    console.log(`📊 Encontrados ${googleUsers.length} usuários do Google:`);
    googleUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ID: ${user.id}`);
    });

    if (googleUsers.length === 0) {
      console.log('\n✅ Nenhum usuário do Google encontrado para deletar.');
      return;
    }

    // Deletar todos os usuários do Google
    console.log('\n🗑️ Deletando usuários do Google...');
    
    for (const user of googleUsers) {
      // Marcar como deletado ao invés de deletar fisicamente
      await prisma.user.update({
        where: { id: user.id },
        data: { deleted: true }
      });
      console.log(`✅ Usuário ${user.name} (${user.email}) marcado como deletado`);
    }

    console.log('\n🎉 Todos os usuários do Google foram removidos!');
    console.log('Agora você pode testar o cadastro automático com Google OAuth.');

  } catch (error) {
    console.error('❌ Erro ao deletar usuários do Google:', error);
  } finally {
    await prisma.$disconnect();
  }
}

deleteGoogleUser();
