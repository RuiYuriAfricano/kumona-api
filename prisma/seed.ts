import { PrismaClient, UserRole, ClinicStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Limpar dados existentes (opcional - descomente se necessário)
  // await prisma.specialistFeedback.deleteMany();
  // await prisma.patientDiagnosis.deleteMany();
  // await prisma.patient.deleteMany();
  // await prisma.clinic.deleteMany();
  // await prisma.notification.deleteMany();
  // await prisma.eyeImage.deleteMany();
  // await prisma.diagnosis.deleteMany();
  // await prisma.preventionActivity.deleteMany();
  // await prisma.userPreferences.deleteMany();
  // await prisma.medicalHistory.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.preventionTip.deleteMany();


  // Criar usuários de exemplo
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 1. ADMIN USER
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@kumona.com' },
    update: {},
    create: {
      name: 'Administrador Kumona',
      email: 'admin@kumona.com',
      password: hashedPassword,
      birthDate: new Date('1980-01-01'),
      about: 'Administrador do sistema Kumona Vision Care',
      phone: '+244 900 000 000',
      role: UserRole.ADMIN,
      profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    },
  });

  // 2. REGULAR USERS
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
      role: UserRole.USER,
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
      role: UserRole.USER,
      profileImage: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    },
  });

  // 3. CLINIC USERS
  const clinicUser1 = await prisma.user.upsert({
    where: { email: 'clinica.visao@example.com' },
    update: {},
    create: {
      name: 'Dr. Carlos Mendes',
      email: 'clinica.visao@example.com',
      password: hashedPassword,
      birthDate: new Date('1975-03-10'),
      about: 'Oftalmologista especializado em doenças da retina',
      phone: '+244 933 111 222',
      role: UserRole.CLINIC,
      profileImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
    },
  });

  const clinicUser2 = await prisma.user.upsert({
    where: { email: 'centro.oftalmico@example.com' },
    update: {},
    create: {
      name: 'Dra. Ana Ferreira',
      email: 'centro.oftalmico@example.com',
      password: hashedPassword,
      birthDate: new Date('1982-07-18'),
      about: 'Oftalmologista com especialização em glaucoma',
      phone: '+244 944 333 444',
      role: UserRole.CLINIC,
      profileImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face',
    },
  });

  // 4. CRIAR CLÍNICAS
  const clinic1 = await prisma.clinic.upsert({
    where: { nif: '1234567890' },
    update: {},
    create: {
      name: 'Clínica Visão Clara',
      nif: '1234567890',
      address: 'Rua das Flores, 123, Maianga',
      city: 'Luanda',
      state: 'LU',
      zipCode: 'CP 1234',
      phone: '(244) 933-111-222',
      email: 'contato@visaoclara.ao',
      website: 'https://visaoclara.ao',
      specialties: ['Oftalmologia Geral', 'Retina', 'Glaucoma'],
      description: 'Clínica especializada em cuidados oftalmológicos com tecnologia de ponta.',
      status: ClinicStatus.APPROVED,
      responsibleName: 'Dr. Carlos Mendes',
      responsibleBi: '123456789AB123',
      responsibleOrmed: 'ORMED-12345',
      userId: clinicUser1.id,
      approvedBy: adminUser.id,
      approvedAt: new Date(),
    },
  });

  const clinic2 = await prisma.clinic.upsert({
    where: { nif: '9876543210' },
    update: {},
    create: {
      name: 'Centro Oftálmico de Angola',
      nif: '9876543210',
      address: 'Avenida Norton de Matos, 456, Centro',
      city: 'Benguela',
      state: 'BE',
      zipCode: 'CP 5678',
      phone: '(244) 944-333-444',
      email: 'info@centrooftalmico.ao',
      website: 'https://centrooftalmico.ao',
      specialties: ['Glaucoma', 'Catarata', 'Cirurgia Refrativa'],
      description: 'Centro especializado em diagnóstico e tratamento de doenças oculares.',
      status: ClinicStatus.APPROVED,
      responsibleName: 'Dra. Ana Ferreira',
      responsibleBi: '987654321CD456',
      responsibleOrmed: 'ORMED-67890',
      userId: clinicUser2.id,
      approvedBy: adminUser.id,
      approvedAt: new Date(),
    },
  });

  // Clínica pendente de aprovação
  const clinicUser3 = await prisma.user.upsert({
    where: { email: 'clinica.nova@example.com' },
    update: {},
    create: {
      name: 'Dr. Pedro Costa',
      email: 'clinica.nova@example.com',
      password: hashedPassword,
      birthDate: new Date('1978-11-25'),
      about: 'Oftalmologista recém-formado',
      phone: '+244 955 666 777',
      role: UserRole.CLINIC,
      profileImage: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face',
    },
  });

  const clinic3 = await prisma.clinic.upsert({
    where: { nif: '1122233344' },
    update: {},
    create: {
      name: 'Clínica Olhar Novo',
      nif: '1122233344',
      address: 'Rua da Esperança, 789, Huambo',
      city: 'Huambo',
      state: 'HU',
      zipCode: 'CP 9101',
      phone: '(244) 955-666-777',
      email: 'contato@olharnovo.ao',
      specialties: ['Oftalmologia Geral', 'Pediatria Oftálmica'],
      description: 'Nova clínica focada em atendimento oftalmológico de qualidade.',
      status: ClinicStatus.PENDING,
      responsibleName: 'Dr. Pedro Costa',
      responsibleBi: '111222333EF789',
      responsibleOrmed: 'ORMED-11111',
      userId: clinicUser3.id,
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

  // 5. CRIAR PACIENTES DAS CLÍNICAS
  const patient1 = await prisma.patient.create({
    data: {
      name: 'José Manuel',
      email: 'jose.manuel@email.com',
      phone: '(244) 911-222-333',
      bi: '123456789AB123',
      birthDate: new Date('1965-04-12'),
      gender: 'M',
      address: 'Rua A, 100',
      city: 'Luanda',
      state: 'LU',
      zipCode: '10001-000',
      allergies: ['Penicilina'],
      medications: ['Colírio para glaucoma'],
      medicalHistory: ['Hipertensão', 'Diabetes tipo 2'],
      clinicId: clinic1.id,
      addedBy: clinicUser1.id,
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      name: 'Ana Beatriz',
      email: 'ana.beatriz@email.com',
      phone: '(244) 922-333-444',
      bi: '987654321CD456',
      birthDate: new Date('1992-08-30'),
      gender: 'F',
      address: 'Avenida B, 200',
      city: 'Luanda',
      state: 'LU',
      zipCode: '10002-000',
      allergies: [],
      medications: ['Vitaminas para os olhos'],
      medicalHistory: ['Miopia'],
      clinicId: clinic1.id,
      addedBy: clinicUser1.id,
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      name: 'Carlos Alberto',
      email: 'carlos.alberto@email.com',
      phone: '(244) 933-444-555',
      bi: '456789123EF789',
      birthDate: new Date('1958-12-05'),
      gender: 'M',
      address: 'Rua C, 300',
      city: 'Benguela',
      state: 'BE',
      zipCode: '20001-000',
      allergies: ['Sulfa'],
      medications: ['Colírio anti-inflamatório'],
      medicalHistory: ['Catarata bilateral'],
      clinicId: clinic2.id,
      addedBy: clinicUser2.id,
    },
  });

  const patient4 = await prisma.patient.create({
    data: {
      name: 'Mariana Silva',
      email: 'mariana.silva@email.com',
      phone: '(244) 944-555-666',
      bi: '789123456GH012',
      birthDate: new Date('1988-06-15'),
      gender: 'F',
      address: 'Avenida D, 400',
      city: 'Benguela',
      state: 'BE',
      zipCode: '20002-000',
      allergies: [],
      medications: [],
      medicalHistory: ['Olho seco'],
      clinicId: clinic2.id,
      addedBy: clinicUser2.id,
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



  // 6. CRIAR DIAGNÓSTICOS DE PACIENTES DAS CLÍNICAS
  const patientDiagnosis1 = await prisma.patientDiagnosis.create({
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'glaucoma',
      severity: 'high',
      score: 92,
      description: 'Sinais claros de glaucoma detectados. Pressão intraocular elevada e danos no nervo óptico.',
      recommendations: [
        'Consulta urgente com oftalmologista',
        'Medição da pressão intraocular',
        'Exame de campo visual',
        'Possível necessidade de colírios hipotensores'
      ],
      patientId: patient1.id,
      clinicId: clinic1.id,
      validated: true,
      validatedBy: clinicUser1.id,
      validatedAt: new Date(),
      specialistNotes: 'Diagnóstico confirmado. Paciente já em tratamento.',
    },
  });

  const patientDiagnosis2 = await prisma.patientDiagnosis.create({
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'normal',
      severity: 'low',
      score: 88,
      description: 'Olhos saudáveis sem sinais de patologias. Exame preventivo normal.',
      recommendations: [
        'Manter consultas oftalmológicas regulares',
        'Proteger os olhos da exposição solar',
        'Manter dieta rica em vitaminas A, C e E'
      ],
      patientId: patient2.id,
      clinicId: clinic1.id,
      validated: true,
      validatedBy: clinicUser1.id,
      validatedAt: new Date(),
      specialistNotes: 'Exame preventivo normal. Paciente orientada.',
    },
  });

  const patientDiagnosis3 = await prisma.patientDiagnosis.create({
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'cataract',
      severity: 'medium',
      score: 78,
      description: 'Catarata bilateral em estágio moderado. Visão parcialmente comprometida.',
      recommendations: [
        'Avaliação para cirurgia de catarata',
        'Uso de óculos de sol com proteção UV',
        'Evitar dirigir à noite',
        'Acompanhamento oftalmológico regular'
      ],
      patientId: patient3.id,
      clinicId: clinic2.id,
      validated: false, // Pendente de validação
    },
  });

  const patientDiagnosis4 = await prisma.patientDiagnosis.create({
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'diabetic_retinopathy',
      severity: 'high',
      score: 85,
      description: 'Retinopatia diabética detectada. Necessária avaliação especializada urgente.',
      recommendations: [
        'Consulta urgente com especialista em retina',
        'Controle rigoroso da glicemia',
        'Monitoramento da pressão arterial',
        'Exames de fundo de olho periódicos'
      ],
      patientId: patient4.id,
      clinicId: clinic2.id,
      validated: true,
      validatedBy: clinicUser2.id,
      validatedAt: new Date(),
      specialistNotes: 'Diagnóstico correto. Paciente encaminhada para especialista em retina.',
      correctedCondition: 'diabetic_retinopathy', // Confirmado pelo especialista
      correctedSeverity: 'high',
    },
  });

  // 7. CRIAR FEEDBACK DE ESPECIALISTAS
  const feedback1 = await prisma.specialistFeedback.create({
    data: {
      diagnosisId: patientDiagnosis1.id,
      isCorrect: true,
      confidence: 9,
      notes: 'Diagnóstico preciso. IA identificou corretamente os sinais de glaucoma.',
      specialistName: 'Dr. Carlos Mendes',
      specialistCrm: 'CRM-AO 12345',
      specialistSpecialty: 'Oftalmologia Geral',
      processed: false,
    },
  });

  const feedback2 = await prisma.specialistFeedback.create({
    data: {
      diagnosisId: patientDiagnosis4.id,
      isCorrect: true,
      correctCondition: 'diabetic_retinopathy',
      correctSeverity: 'high',
      confidence: 10,
      notes: 'Excelente detecção de retinopatia diabética. IA muito precisa neste caso.',
      specialistName: 'Dra. Ana Ferreira',
      specialistCrm: 'CRM-AO 67890',
      specialistSpecialty: 'Glaucoma e Retina',
      processed: false,
    },
  });

  // Diagnóstico com correção (para treinar a IA)
  const patientDiagnosis5 = await prisma.patientDiagnosis.create({
    data: {
      imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400&h=300&fit=crop',
      condition: 'normal', // IA disse normal
      severity: 'low',
      score: 65,
      description: 'Olhos aparentemente saudáveis.',
      recommendations: ['Manter cuidados preventivos'],
      patientId: patient1.id,
      clinicId: clinic1.id,
      validated: true,
      validatedBy: clinicUser1.id,
      validatedAt: new Date(),
      specialistNotes: 'IA errou. Há sinais iniciais de glaucoma.',
      correctedCondition: 'glaucoma', // Especialista corrigiu
      correctedSeverity: 'low',
    },
  });

  const feedback3 = await prisma.specialistFeedback.create({
    data: {
      diagnosisId: patientDiagnosis5.id,
      isCorrect: false, // IA errou
      correctCondition: 'glaucoma',
      correctSeverity: 'low',
      confidence: 8,
      notes: 'IA não detectou sinais iniciais de glaucoma. Necessário melhorar sensibilidade para casos iniciais.',
      specialistName: 'Dr. Carlos Mendes',
      specialistCrm: 'CRM-AO 12345',
      specialistSpecialty: 'Oftalmologia Geral',
      processed: false, // Será usado para treinar a IA
    },
  });

  // Criar diagnósticos de exemplo (usuários regulares)
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
  console.log('📊 Dados criados:');
  console.log(`   👥 Usuários: 6 (1 admin, 2 regulares, 3 clínicas)`);
  console.log(`   🏥 Clínicas: 3 (2 aprovadas, 1 pendente)`);
  console.log(`   👤 Pacientes: 4`);
  console.log(`   🔍 Diagnósticos de pacientes: 5`);
  console.log(`   💬 Feedback de especialistas: 3`);
  console.log(`   🏥 Histórico médico: 2`);
  console.log(`   ⚙️ Preferências: 2`);
  console.log(`   🔍 Diagnósticos regulares: 3`);
  console.log(`   💡 Dicas de prevenção: ${preventionTips.length}`);

  console.log(`   🏃‍♂️ Atividades de prevenção: ${preventionActivities.length}`);
  console.log(`   🔔 Notificações: ${notifications.length}`);
  console.log('');
  console.log('🔑 Credenciais de acesso:');
  console.log('');
  console.log('👨‍💼 ADMIN:');
  console.log('   📧 Email: admin@kumona.com');
  console.log('   🔒 Senha: 123456');
  console.log('');
  console.log('🏥 CLÍNICAS:');
  console.log('   📧 Email: clinica.visao@example.com (Aprovada)');
  console.log('   📧 Email: centro.oftalmico@example.com (Aprovada)');
  console.log('   📧 Email: clinica.nova@example.com (Pendente)');
  console.log('   🔒 Senha: 123456');
  console.log('');
  console.log('👤 USUÁRIOS REGULARES:');
  console.log('   📧 Email: joao@example.com');
  console.log('   📧 Email: maria@example.com');
  console.log('   🔒 Senha: 123456');
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
