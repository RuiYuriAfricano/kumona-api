const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkCorrections() {
  try {
    console.log('🔍 Verificando correções no banco de dados...\n');

    // Verificar PatientDiagnosis com correções
    const patientDiagnosesWithCorrections = await prisma.patientDiagnosis.findMany({
      where: {
        validated: true,
        correctedCondition: {
          not: null
        }
      },
      select: {
        id: true,
        condition: true,
        correctedCondition: true,
        severity: true,
        correctedSeverity: true,
        imageUrl: true,
        validated: true,
        validatedAt: true,
        specialistNotes: true,
        patient: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`📊 Total de PatientDiagnosis com correções: ${patientDiagnosesWithCorrections.length}\n`);

    if (patientDiagnosesWithCorrections.length > 0) {
      console.log('Exemplos:');
      patientDiagnosesWithCorrections.slice(0, 5).forEach((d, i) => {
        console.log(`\n${i + 1}. ID: ${d.id}`);
        console.log(`   Paciente: ${d.patient.name}`);
        console.log(`   Condição Original: ${d.condition}`);
        console.log(`   Condição Corrigida: ${d.correctedCondition}`);
        console.log(`   Imagem: ${d.imageUrl}`);
        console.log(`   Validado em: ${d.validatedAt}`);
      });
    }

    // Verificar total de PatientDiagnosis validados
    const totalValidated = await prisma.patientDiagnosis.count({
      where: {
        validated: true
      }
    });

    console.log(`\n📈 Total de PatientDiagnosis validados: ${totalValidated}`);

    // Verificar SpecialistFeedback
    const feedbacks = await prisma.specialistFeedback.findMany({
      take: 5,
      include: {
        diagnosis: {
          select: {
            condition: true,
            correctedCondition: true
          }
        }
      }
    });

    console.log(`\n💬 Total de SpecialistFeedback: ${feedbacks.length}`);

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCorrections();

