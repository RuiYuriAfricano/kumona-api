import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (opcional - descomente se necessário)
  // await prisma.notification.deleteMany();
  // await prisma.eyeImage.deleteMany();
  // await prisma.diagnosis.deleteMany();
  // await prisma.preventionActivity.deleteMany();
  // await prisma.userPreferences.deleteMany();
  // await prisma.medicalHistory.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.preventionTip.deleteMany();
  // await prisma.eyeExercise.deleteMany();

  // Criar usuários de exemplo
  const hashedPassword = await bcrypt.hash('123456', 10);

  const user1 = await prisma.user.upsert({
    where: { email: 'joao@example.com' },
    update: {},
    create: {
      name: 'João Silva',
      email: 'joao@example.com',
      password: hashedPassword,
      birthDate: new Date('1990-05-15'),
      about: 'Desenvolvedor de software interessado em saúde ocular',
      phone: '+244 923 456 789',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      name: 'Maria Santos',
      email: 'maria@example.com',
      password: hashedPassword,
      birthDate: new Date('1985-08-22'),
      about: 'Professora que passa muito tempo em frente ao computador',
      phone: '+244 912 345 678',
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    },
  });

  // Criar histórico médico
  await prisma.medicalHistory.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      existingConditions: ['Miopia leve'],
      familyHistory: ['Glaucoma (avô paterno)'],
      medications: ['Colírio lubrificante'],
    },
  });

  await prisma.medicalHistory.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      existingConditions: ['Olho seco'],
      familyHistory: ['Catarata (mãe)'],
      medications: [],
    },
  });

  // Criar preferências de usuário
  await prisma.userPreferences.upsert({
    where: { userId: user1.id },
    update: {},
    create: {
      userId: user1.id,
      notificationsEnabled: true,
      reminderFrequency: 'daily',
      language: 'pt',
    },
  });

  await prisma.userPreferences.upsert({
    where: { userId: user2.id },
    update: {},
    create: {
      userId: user2.id,
      notificationsEnabled: true,
      reminderFrequency: 'weekly',
      language: 'pt',
    },
  });

  // Criar dicas de prevenção
  const preventionTips = [
    {
      title: 'Regra 20-20-20',
      description: 'A cada 20 minutos, olhe para algo a 20 pés (6 metros) de distância por 20 segundos para reduzir a fadiga ocular.',
      category: 'Uso de telas',
    },
    {
      title: 'Hidratação adequada',
      description: 'Beba pelo menos 2 litros de água por dia para manter seus olhos hidratados e saudáveis.',
      category: 'Saúde geral',
    },
    {
      title: 'Proteção UV',
      description: 'Use óculos de sol com proteção UV ao ar livre, mesmo em dias nublados, para proteger seus olhos dos raios solares.',
      category: 'Proteção',
    },
    {
      title: 'Pisque com frequência',
      description: 'Pisque conscientemente com mais frequência ao usar dispositivos digitais para manter os olhos lubrificados.',
      category: 'Uso de telas',
    },
    {
      title: 'Iluminação adequada',
      description: 'Mantenha uma iluminação adequada no ambiente de trabalho para reduzir o esforço ocular.',
      category: 'Ambiente',
    },
    {
      title: 'Dieta rica em vitaminas',
      description: 'Consuma alimentos ricos em vitaminas A, C e E, como cenoura, espinafre e frutas cítricas.',
      category: 'Nutrição',
    },
  ];

  for (const tipData of preventionTips) {
    await prisma.preventionTip.create({
      data: tipData,
    });
  }

  // Criar exercícios oculares
  const eyeExercises = [
    {
      title: 'Exercício de Foco',
      description: 'Alterne o foco entre objetos próximos e distantes para fortalecer os músculos oculares.',
      instructions: [
        'Segure o dedo a 15cm do rosto',
        'Foque no dedo por 3 segundos',
        'Mude o foco para um objeto distante',
        'Mantenha o foco por 3 segundos',
        'Repita 10 vezes'
      ],
      duration: 5,
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=300&h=200&fit=crop',
    },
    {
      title: 'Movimento Circular',
      description: 'Mova os olhos em círculos para relaxar e fortalecer os músculos oculares.',
      instructions: [
        'Feche os olhos suavemente',
        'Mova os olhos em círculos lentos no sentido horário',
        'Faça 5 círculos completos',
        'Mude para o sentido anti-horário',
        'Faça mais 5 círculos',
        'Abra os olhos e relaxe'
      ],
      duration: 3,
      imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=300&h=200&fit=crop',
    },
    {
      title: 'Piscada Consciente',
      description: 'Exercício de piscada para lubrificar os olhos e reduzir o ressecamento.',
      instructions: [
        'Sente-se confortavelmente',
        'Pisque normalmente 5 vezes',
        'Feche os olhos firmemente por 2 segundos',
        'Abra e pisque rapidamente 10 vezes',
        'Relaxe por 5 segundos',
        'Repita o ciclo 3 vezes'
      ],
      duration: 2,
      imageUrl: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=300&h=200&fit=crop',
    },
  ];

  for (const exerciseData of eyeExercises) {
    await prisma.eyeExercise.create({
      data: exerciseData,
    });
  }

  // Criar diagnósticos de exemplo
  const diagnosis1 = await prisma.diagnosis.create({
    data: {
      userId: user1.id,
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'Olhos saudáveis',
      severity: 'low',
      score: 85,
      description: 'Seus olhos apresentam boa saúde geral. Continue mantendo bons hábitos de cuidado ocular.',
      recommendations: [
        'Continue fazendo pausas regulares durante o uso de telas',
        'Mantenha uma dieta rica em vitaminas A, C e E',
        'Use óculos de sol com proteção UV quando ao ar livre',
        'Realize exames oftalmológicos anuais'
      ],
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
    },
  });

  const diagnosis2 = await prisma.diagnosis.create({
    data: {
      userId: user1.id,
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'Leve ressecamento ocular',
      severity: 'medium',
      score: 72,
      description: 'Detectamos sinais de ressecamento ocular leve. Isso é comum em pessoas que passam muito tempo em frente a telas.',
      recommendations: [
        'Use colírio lubrificante sem conservantes',
        'Aumente a frequência de piscadas',
        'Mantenha umidade adequada no ambiente',
        'Faça pausas mais frequentes durante o trabalho'
      ],
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
    },
  });

  const diagnosis3 = await prisma.diagnosis.create({
    data: {
      userId: user2.id,
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'Fadiga ocular',
      severity: 'medium',
      score: 68,
      description: 'Sinais de fadiga ocular detectados. Recomendamos ajustes na rotina de trabalho e descanso.',
      recommendations: [
        'Aplique a regra 20-20-20 rigorosamente',
        'Ajuste o brilho e contraste da tela',
        'Considere usar filtro de luz azul',
        'Realize exercícios oculares diariamente'
      ],
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 dias atrás
    },
  });

  // Criar atividades de prevenção
  const preventionActivities = [
    {
      userId: user1.id,
      type: 'exercise',
      description: 'Exercício de foco - alternância entre objetos próximos e distantes',
      duration: 5,
      notes: 'Senti alívio na tensão ocular',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      userId: user1.id,
      type: 'rest',
      description: 'Pausa de 20 minutos longe das telas',
      duration: 20,
      notes: 'Pausa durante o trabalho',
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
    },
    {
      userId: user2.id,
      type: 'exercise',
      description: 'Movimento circular dos olhos',
      duration: 3,
      notes: 'Exercício matinal',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      userId: user2.id,
      type: 'rest',
      description: 'Descanso visual durante a aula',
      duration: 15,
      notes: 'Pausa entre as aulas',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
    },
  ];

  for (const activity of preventionActivities) {
    await prisma.preventionActivity.create({
      data: activity,
    });
  }

  // Criar notificações
  const notifications = [
    {
      userId: user1.id,
      title: 'Lembrete de Diagnóstico',
      message: 'É hora de realizar um novo diagnóstico ocular. Mantenha sua saúde visual em dia!',
      type: 'info',
      read: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    },
    {
      userId: user1.id,
      title: 'Exercício Recomendado',
      message: 'Que tal fazer alguns exercícios oculares? Seus olhos vão agradecer!',
      type: 'success',
      read: true,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    },
    {
      userId: user2.id,
      title: 'Resultado de Diagnóstico',
      message: 'Seu diagnóstico recente indica fadiga ocular. Confira as recomendações personalizadas.',
      type: 'warning',
      read: false,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 horas atrás
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.create({
      data: notification,
    });
  }

  console.log('✅ Seed concluído com sucesso!');
  console.log(`👤 Usuários criados: ${user1.name}, ${user2.name}`);
  console.log(`💡 ${preventionTips.length} dicas de prevenção criadas`);
  console.log(`🏃 ${eyeExercises.length} exercícios oculares criados`);
  console.log(`🔬 ${3} diagnósticos de exemplo criados`);
  console.log(`📋 ${preventionActivities.length} atividades de prevenção criadas`);
  console.log(`🔔 ${notifications.length} notificações criadas`);
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
