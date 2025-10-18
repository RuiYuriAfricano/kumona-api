const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  try {
    console.log('🔍 Verificando usuários no banco de dados...\n');

    // Contar usuários
    const userCount = await prisma.user.count();
    console.log(`👥 Total de usuários: ${userCount}`);

    // Listar usuários
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          deleted: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('\n📋 Lista de usuários:');
      users.forEach(user => {
        const passwordType = user.password === '' ? 'Google' : 'Email/Senha';
        const status = user.deleted ? 'DELETADO' : 'ATIVO';
        console.log(`  - ${user.name} (${user.email})`);
        console.log(`    ID: ${user.id}, Tipo: ${passwordType}, Role: ${user.role}, Status: ${status}`);
        console.log(`    Criado: ${user.createdAt.toISOString()}`);
        console.log('');
      });

      // Verificar usuários do Google especificamente
      const googleUsers = users.filter(u => u.password === '');
      console.log(`🔍 Usuários do Google: ${googleUsers.length}`);
      if (googleUsers.length > 0) {
        googleUsers.forEach(user => {
          console.log(`  - ${user.name} (${user.email})`);
        });
      }
    } else {
      console.log('\n❌ Nenhum usuário encontrado no banco de dados');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
