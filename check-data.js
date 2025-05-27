const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkData() {
  try {
    console.log('🔍 Verificando dados no banco...\n');

    // Contar usuários
    const userCount = await prisma.user.count();
    console.log(`👥 Usuários: ${userCount}`);

    // Listar usuários
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        }
      });
      console.log('📋 Lista de usuários:');
      users.forEach(user => {
        console.log(`  - ${user.name} (${user.email}) - ID: ${user.id}`);
      });
    }

    // Contar outras tabelas
    const diagnosisCount = await prisma.diagnosis.count();
    const tipsCount = await prisma.preventionTip.count();
    const exercisesCount = await prisma.eyeExercise.count();
    const notificationsCount = await prisma.notification.count();
    const activitiesCount = await prisma.preventionActivity.count();

    console.log(`\n📊 Resumo dos dados:`);
    console.log(`🔬 Diagnósticos: ${diagnosisCount}`);
    console.log(`💡 Dicas de prevenção: ${tipsCount}`);
    console.log(`🏃 Exercícios oculares: ${exercisesCount}`);
    console.log(`🔔 Notificações: ${notificationsCount}`);
    console.log(`📋 Atividades: ${activitiesCount}`);

    if (userCount === 0) {
      console.log('\n❌ Nenhum dado encontrado! O seed pode não ter funcionado.');
    } else {
      console.log('\n✅ Dados encontrados no banco!');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
