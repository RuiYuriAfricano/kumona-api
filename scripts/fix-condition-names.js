const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixConditionNames() {
  console.log('🔧 Iniciando correção dos nomes das condições...');

  try {
    // Mapear condições em português para inglês
    const conditionMapping = {
      'Olhos saudáveis': 'normal',
      'Catarata': 'cataract',
      'Retinopatia diabética': 'diabetic_retinopathy',
      'Glaucoma': 'glaucoma'
    };

    // Corrigir tabela Diagnosis
    console.log('📋 Corrigindo tabela Diagnosis...');
    for (const [portuguese, english] of Object.entries(conditionMapping)) {
      const result = await prisma.diagnosis.updateMany({
        where: {
          condition: portuguese
        },
        data: {
          condition: english
        }
      });
      
      if (result.count > 0) {
        console.log(`✅ Atualizados ${result.count} registros de "${portuguese}" para "${english}" na tabela Diagnosis`);
      }
    }

    // Corrigir tabela PatientDiagnosis
    console.log('🏥 Corrigindo tabela PatientDiagnosis...');
    for (const [portuguese, english] of Object.entries(conditionMapping)) {
      const result = await prisma.patientDiagnosis.updateMany({
        where: {
          condition: portuguese
        },
        data: {
          condition: english
        }
      });
      
      if (result.count > 0) {
        console.log(`✅ Atualizados ${result.count} registros de "${portuguese}" para "${english}" na tabela PatientDiagnosis`);
      }
    }

    // Verificar se há duplicatas após a correção
    console.log('🔍 Verificando dados após correção...');
    
    const diagnosisStats = await prisma.diagnosis.groupBy({
      by: ['condition'],
      _count: true
    });
    
    const patientDiagnosisStats = await prisma.patientDiagnosis.groupBy({
      by: ['condition'],
      _count: true
    });

    console.log('\n📊 Estatísticas da tabela Diagnosis:');
    diagnosisStats.forEach(stat => {
      console.log(`  ${stat.condition}: ${stat._count} registros`);
    });

    console.log('\n🏥 Estatísticas da tabela PatientDiagnosis:');
    patientDiagnosisStats.forEach(stat => {
      console.log(`  ${stat.condition}: ${stat._count} registros`);
    });

    console.log('\n✅ Correção concluída com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
fixConditionNames();
