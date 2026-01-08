const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addTestCorrections() {
  try {
    console.log('🔧 Adicionando correções de teste...\n');

    // Buscar alguns diagnósticos não validados
    const diagnoses = await prisma.patientDiagnosis.findMany({
      where: {
        validated: false
      },
      take: 5
    });

    console.log(`📊 Encontrados ${diagnoses.length} diagnósticos não validados\n`);

    if (diagnoses.length === 0) {
      console.log('❌ Nenhum diagnóstico não validado encontrado');
      return;
    }

    // Adicionar correções
    const corrections = [
      { original: 'normal', corrected: 'cataract' },
      { original: 'cataract', corrected: 'glaucoma' },
      { original: 'glaucoma', corrected: 'diabetic_retinopathy' },
      { original: 'diabetic_retinopathy', corrected: 'normal' },
      { original: 'normal', corrected: 'glaucoma' }
    ];

    for (let i = 0; i < Math.min(diagnoses.length, corrections.length); i++) {
      const diagnosis = diagnoses[i];
      const correction = corrections[i];

      await prisma.patientDiagnosis.update({
        where: { id: diagnosis.id },
        data: {
          validated: true,
          correctedCondition: correction.corrected,
          specialistNotes: `Correção de teste: ${correction.original} → ${correction.corrected}`,
          validatedAt: new Date()
        }
      });

      console.log(`✅ Diagnóstico ${diagnosis.id} atualizado:`);
      console.log(`   ${correction.original} → ${correction.corrected}`);
    }

    console.log('\n✅ Correções de teste adicionadas com sucesso!');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestCorrections();

