 EventFlow - Requerimientos Funcionales Detallados
Sistema de Gestión para Productoras de Eventos Electrónicos
Versión: 1.0
 Fecha: Enero 2026

TABLA DE CONTENIDOS
Feature 1: Sistema de Cortesías Automatizado con IA
Feature 2: IA Calculadora Logística
Feature 3: Generador de Flyers con IA
Feature 4: Sistema de Roles y Permisos
Feature 5: Sistema de Lealtad
Feature 6: Validación QR Offline
Integraciones Técnicas
Modelo de Datos

<a name="feature-1"></a>
FEATURE 1: SISTEMA DE CORTESÍAS AUTOMATIZADO CON IA
1.1 DESCRIPCIÓN GENERAL
Objetivo: Automatizar el proceso de verificación y activación de cortesías/free passes para promotores e influencers, reduciendo el tiempo de gestión de 2-3 horas a 2-3 minutos por campaña.
Alcance: Módulo completo de gestión de cortesías desde creación de campaña hasta pago de comisiones, con verificación automática mediante IA.

1.2 ACTORES DEL SISTEMA
Actor
Descripción
Permisos
Admin
Dueño/gerente de la productora
Crear campañas, aprobar pagos, ver reportes globales
Marketing Manager
Encargado de marketing y ventas
Crear campañas, gestionar promotores, ver analytics
Promotor/Influencer
Usuario externo que promociona eventos
Subir contenido, ver sus métricas, canjear free passes
Sistema IA
Motor de verificación automática
Validar contenido, activar free passes, calcular métricas


1.3 FLUJO PRINCIPAL DEL PROCESO
PASO 1: Creación de Campaña de Cortesías
RF-001: Formulario de Creación de Campaña
Entrada del usuario:
Campos obligatorios:
- Evento asociado (dropdown de eventos activos)
- Tipo de campaña (radio buttons):
  ○ Promoción con verificación automática
  ○ Free pass directo (sin requisitos)
  ○ Código de descuento con tracking

Campos opcionales según tipo:
- Nombre de la campaña
- Descripción interna
- Fecha de inicio y fin

Reglas de negocio:
Solo eventos con estado "Aprobado" o "En venta" pueden tener campañas
No se pueden crear campañas para eventos con fecha pasada
Máximo 100 campañas activas simultáneas por productora (límite configurable)
Salida del sistema:
Campaña creada con ID único
Estado inicial: "Borrador"
Timestamp de creación

RF-002: Configuración de Promotor Individual
Campos del formulario:
DATOS DEL PROMOTOR:
┌─────────────────────────────────────────┐
│ Buscar promotor existente:              │
│ [🔍 @username o email_____________]     │
│                                         │
│ O agregar manualmente:                  │
│ Nombre completo: [___________________]  │
│ Instagram: [@_______________________]   │
│ Email: [____________________________]   │
│ Teléfono: [+54 ______________________]  │
│ Seguidores aprox: [_________________]   │
└─────────────────────────────────────────┘

BENEFICIOS PARA EL PROMOTOR:
┌─────────────────────────────────────────┐
│ Free passes: [2 ▼] entradas             │
│ Código de descuento personal:           │
│ ☑ Activar código único                  │
│   Descuento: [15 ▼] %                   │
│   Usos ilimitados: ☐                    │
│   Límite de usos: [50]                  │
│   Válido hasta: [Fecha evento - 1 día]  │
└─────────────────────────────────────────┘

CONDICIONES PARA ACTIVAR FREE PASSES:
┌─────────────────────────────────────────┐
│ Plataforma: ☑ Instagram  ☐ TikTok       │
│                                         │
│ Requisitos de contenido:                │
│ ☑ Subir flyer del evento                │
│ ☑ Arrobar cuenta: [@productora______]   │
│ ☑ Usar hashtag: [#EventoTechno______]   │
│ ☐ Mínimo de alcance: [1000] views       │
│ ☐ Publicar en Feed (además de Stories)  │
│ ☐ Etiquetar ubicación del evento        │
│                                         │
│ Deadline: [DD/MM/YYYY] (default: 3 días │
│           antes del evento)             │
└─────────────────────────────────────────┘

COMISIÓN POR VENTA (OPCIONAL):
┌─────────────────────────────────────────┐
│ ☑ Pagar comisión por ventas generadas   │
│   Porcentaje: [5 ▼] % del ticket        │
│   Pago: ⚫ Post-evento  ⚪ Inmediato     │
│   Método: ⚫ Mercado Pago  ⚪ Transfer   │
└─────────────────────────────────────────┘

Validaciones:
Email debe ser único en el sistema
Handle de Instagram debe comenzar con @
Teléfono debe tener formato válido (regex)
Porcentaje de descuento: 5% - 50%
Cantidad de free passes: 1 - 10
Deadline mínimo: 24hs antes del evento
Si elige comisión, debe configurar método de pago
Salida del sistema:
{
  "promoter_id": "uuid",
  "campaign_id": "uuid",
  "unique_link": "https://eventflow.app/promo/ABC123XYZ",
  "discount_code": "PROMO-TECH-001",
  "free_passes_allocated": 2,
  "conditions": {
    "platform": "instagram",
    "requires_flyer": true,
    "requires_mention": "@productora",
    "requires_hashtag": "#EventoTechno",
    "min_reach": null,
    "deadline": "2026-01-25T23:59:59Z"
  },
  "status": "pending_submission"
}


RF-003: Notificaciones Automáticas al Promotor
Trigger: Al guardar la configuración del promotor
Canales:
Email (principal)
SMS (opcional, si teléfono disponible)
WhatsApp (opcional, si API disponible)
Contenido del email:
Asunto: 🎉 Invitación para promocionar [Nombre del Evento]

Hola [Nombre del Promotor],

¡Tenemos una propuesta para vos!

Te invitamos a promocionar nuestro evento:
📍 [Nombre del Evento]
📅 [Fecha y hora]
📍 [Ubicación]

🎁 TU BENEFICIO:
✅ [X] entradas gratis
✅ Código de descuento personal del [X]% para compartir

💰 GANA DINERO:
Por cada persona que compre con tu código, ganás [X]% de comisión.

📋 ¿QUÉ TENÉS QUE HACER?
1. Subir el flyer del evento en tu Instagram
2. Arrobarnos: @productora
3. Usar el hashtag: #EventoTechno
4. Hacerlo antes del [Fecha límite]

👉 EMPEZÁ ACÁ: [Link único]

Una vez que subas el contenido, nuestro sistema lo verifica
automáticamente en minutos y activamos tus entradas.

¿Dudas? Respondé este email.

¡Gracias por ser parte de la movida!
[Nombre de la Productora]

---
[Link de ayuda] | [Términos y condiciones]

Recordatorios automáticos:
48hs antes del deadline: Si no subió contenido
24hs antes del deadline: Recordatorio urgente
6hs antes del deadline: Última oportunidad

PASO 2: Promotor Sube Contenido
RF-004: Landing Page del Promotor
URL: https://eventflow.app/promo/[UNIQUE_CODE]
Contenido de la página:
┌─────────────────────────────────────────────────┐
│ EventFlow                          [Ayuda]      │
├─────────────────────────────────────────────────┤
│                                                 │
│  🎉 Campaña: Techno Underground                 │
│  📅 Evento: 15 de Diciembre, 22:00hs            │
│  📍 Av. Liniers 2466, Tigre                     │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🎁 TUS BENEFICIOS                       │   │
│  │ ✅ 2 entradas gratis                    │   │
│  │ ✅ Código 15% OFF para compartir        │   │
│  │ 💰 Comisión: 5% por cada venta          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📋 REQUISITOS PARA ACTIVAR TUS ENTRADAS │   │
│  │ ☐ Subir flyer en Instagram              │   │
│  │ ☐ Arrobar @amnesia.productions          │   │
│  │ ☐ Usar hashtag #TechnoUnderground       │   │
│  │ ⏰ Deadline: 12/Dic 23:59hs             │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 📤 SUBIR TU PUBLICACIÓN                 │   │
│  │                                         │   │
│  │ Plataforma: ⚫ Instagram  ⚪ TikTok      │   │
│  │                                         │   │
│  │ Link de tu post/story:                  │   │
│  │ [https://instagram.com/p/______]        │   │
│  │                                         │   │
│  │ O sube screenshot:                      │   │
│  │ [📎 Seleccionar archivo]                │   │
│  │                                         │   │
│  │ [🚀 ENVIAR PARA VERIFICACIÓN]           │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  💡 Tip: Asegurate de que tu perfil sea        │
│     público para que podamos verificarlo.       │
│                                                 │
└─────────────────────────────────────────────────┘

Validaciones frontend:
URL debe ser de Instagram o TikTok (según configurado)
Formato válido de URL
O screenshot debe ser imagen válida (jpg, png, webp)
Tamaño máximo: 5MB

RF-005: Envío y Registro de Contenido
Acción: Usuario hace click en "Enviar para verificación"
Proceso backend:
Validación de inputs:
if (url) {
  // Validar formato de URL
  if (!isValidInstagramURL(url)) {
    return error("URL de Instagram inválida");
  }
} else if (screenshot) {
  // Validar imagen
  if (screenshot.size > 5MB) {
    return error("Imagen muy grande (máx 5MB)");
  }
}

Guardar en base de datos:
INSERT INTO promoter_submissions (
  id,
  campaign_id,
  promoter_id,
  submission_type, -- 'url' o 'screenshot'
  content_url,
  screenshot_url,
  platform,
  status, -- 'pending_verification'
  submitted_at
) VALUES (...);

Encolar trabajo de verificación:
await queue.add('verify-promoter-content', {
  submission_id: submissionId,
  campaign_id: campaignId,
  promoter_id: promoterId
});

Respuesta al usuario:
{
  "status": "success",
  "message": "Contenido enviado. Verificando...",
  "submission_id": "uuid",
  "estimated_time": "2-3 minutos"
}

UI mientras verifica:
┌─────────────────────────────────────┐
│ 🔄 VERIFICANDO TU CONTENIDO...      │
│                                     │
│ ████████████░░░░░░░░ 60%            │
│                                     │
│ Esto toma entre 2-3 minutos.        │
│ Podés cerrar esta página, te        │
│ avisamos por email cuando esté listo│
│                                     │
│ [Refrescar estado]                  │
└─────────────────────────────────────┘


PASO 3: Verificación Automática con IA
RF-006: Motor de Verificación con IA
Arquitectura:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Submission │ -> │ Queue Worker │ -> │ IA Services │
└─────────────┘    └──────────────┘    └─────────────┘
                           │
                           ↓
                   ┌───────────────┐
                   │ Decision Tree │
                   └───────────────┘
                           │
                   ┌───────┴───────┐
                   ↓               ↓
              ✅ Approved    ❌ Rejected

Proceso de verificación:
ETAPA 1: Obtención del Contenido
Si es URL de Instagram:
async function fetchInstagramPost(url) {
  // Usar Instagram Graph API o scraping ético
  const postData = await instagramAPI.getPost(url);
  
  return {
    images: postData.images,
    caption: postData.caption,
    mentions: postData.mentions,
    hashtags: postData.hashtags,
    reach: postData.insights?.reach || null,
    likes: postData.likes_count,
    comments: postData.comments_count,
    posted_at: postData.created_time
  };
}

Si es screenshot:
async function analyzeScreenshot(imageUrl) {
  // Subir a storage
  const publicUrl = await storage.upload(imageUrl);
  
  return {
    images: [publicUrl],
    caption: null, // Se extraerá con OCR
    mentions: null, // Se extraerá con OCR
    hashtags: null, // Se extraerá con OCR
    reach: null,
    manual_verification_required: true
  };
}


ETAPA 2: Verificación con Computer Vision
RF-007: Detección de Flyer en Imagen
Servicio: Google Cloud Vision API o AWS Rekognition
async function detectFlyerInImage(imageUrl, referenceFlyer) {
  // 1. Obtener el flyer de referencia del evento
  const eventFlyer = await getEventFlyer(campaignId);
  
  // 2. Comparar con IA
  const result = await visionAPI.compareImages({
    image1: imageUrl,
    image2: eventFlyer,
    threshold: 0.75 // 75% de similitud mínima
  });
  
  return {
    flyer_detected: result.similarity >= 0.75,
    similarity_score: result.similarity,
    confidence: result.confidence
  };
}

Reglas de decisión:
Similitud >= 85%: ✅ Aprobado automáticamente
Similitud 70-85%: ⚠️ Revisión manual sugerida
Similitud < 70%: ❌ Rechazado automáticamente

ETAPA 3: Verificación de Texto (OCR)
RF-008: Extracción y Validación de Texto
async function verifyTextRequirements(postData, requirements) {
  let caption = postData.caption;
  
  // Si es screenshot, extraer texto con OCR
  if (!caption && postData.images) {
    caption = await ocrService.extractText(postData.images[0]);
  }
  
  const results = {
    mention_found: false,
    hashtag_found: false,
    details: {}
  };
  
  // Verificar mención
  if (requirements.requires_mention) {
    const mentionRegex = new RegExp(
      `@${requirements.mention_account}`,
      'gi'
    );
    results.mention_found = mentionRegex.test(caption) ||
                           postData.mentions?.includes(requirements.mention_account);
    results.details.mention = {
      required: requirements.mention_account,
      found: results.mention_found
    };
  }
  
  // Verificar hashtag
  if (requirements.requires_hashtag) {
    const hashtagRegex = new RegExp(
      requirements.hashtag.replace('#', ''),
      'gi'
    );
    results.hashtag_found = hashtagRegex.test(caption) ||
                           postData.hashtags?.includes(requirements.hashtag);
    results.details.hashtag = {
      required: requirements.hashtag,
      found: results.hashtag_found
    };
  }
  
  return results;
}


ETAPA 4: Verificación de Alcance (si requerido)
RF-009: Validación de Métricas
async function verifyReachRequirement(postData, minReach) {
  if (!minReach) return { passed: true };
  
  // Si tenemos datos directos de la API
  if (postData.reach) {
    return {
      passed: postData.reach >= minReach,
      actual_reach: postData.reach,
      required_reach: minReach
    };
  }
  
  // Si no, estimar basado en likes/comments/seguidores
  const estimatedReach = estimateReach({
    likes: postData.likes,
    comments: postData.comments,
    followers: postData.follower_count
  });
  
  return {
    passed: estimatedReach >= minReach,
    actual_reach: estimatedReach,
    required_reach: minReach,
    is_estimated: true
  };
}

function estimateReach(data) {
  // Fórmula simplificada: engagement * factor
  const engagement = data.likes + (data.comments * 3);
  const estimatedReach = engagement * 10; // Ajustar según datos históricos
  return Math.min(estimatedReach, data.followers * 0.3); // Cap al 30% de followers
}


ETAPA 5: Decisión Final
RF-010: Motor de Decisión
async function makeVerificationDecision(verificationResults) {
  const {
    flyer_check,
    text_check,
    reach_check,
    requirements
  } = verificationResults;
  
  // Array para almacenar razones de rechazo
  const rejectionReasons = [];
  
  // Verificar cada requisito
  if (requirements.requires_flyer && !flyer_check.flyer_detected) {
    rejectionReasons.push({
      requirement: 'flyer',
      message: 'No detectamos el flyer del evento en tu publicación',
      suggestion: 'Asegurate de que el flyer sea claramente visible'
    });
  }
  
  if (requirements.requires_mention && !text_check.mention_found) {
    rejectionReasons.push({
      requirement: 'mention',
      message: `Falta arrobar a ${requirements.mention_account}`,
      suggestion: 'Agregá la mención en el caption o en la publicación'
    });
  }
  
  if (requirements.requires_hashtag && !text_check.hashtag_found) {
    rejectionReasons.push({
      requirement: 'hashtag',
      message: `Falta el hashtag ${requirements.hashtag}`,
      suggestion: 'Agregá el hashtag en el caption'
    });
  }
  
  if (requirements.min_reach && !reach_check.passed) {
    rejectionReasons.push({
      requirement: 'reach',
      message: `Alcance insuficiente (${reach_check.actual_reach} vs ${reach_check.required_reach} requerido)`,
      suggestion: 'Este post necesita más alcance para calificar'
    });
  }
  
  // Decisión
  if (rejectionReasons.length === 0) {
    return {
      decision: 'approved',
      confidence: calculateConfidence(verificationResults),
      message: '¡Felicitaciones! Tu contenido cumple todos los requisitos'
    };
  } else {
    return {
      decision: 'rejected',
      reasons: rejectionReasons,
      message: 'Tu contenido no cumple algunos requisitos',
      can_resubmit: true
    };
  }
}

function calculateConfidence(results) {
  // Calcular score de confianza basado en todos los checks
  let score = 0;
  let total = 0;
  
  if (results.flyer_check) {
    score += results.flyer_check.similarity_score || 0;
    total += 1;
  }
  
  // ... más checks
  
  return Math.round((score / total) * 100);
}


RF-011: Actualización de Estado y Notificaciones
Si es APROBADO:
async function approveSubmission(submissionId, campaignId, promoterId) {
  // 1. Actualizar estado
  await db.submissions.update(submissionId, {
    status: 'approved',
    verified_at: new Date(),
    verification_confidence: confidenceScore
  });
  
  // 2. Activar free passes
  const freePasses = await generateFreePasses({
    campaign_id: campaignId,
    promoter_id: promoterId,
    quantity: campaign.free_passes_allocated
  });
  
  // 3. Guardar datos de verificación para analytics
  await db.verificationLogs.create({
    submission_id: submissionId,
    flyer_similarity: flyerCheck.similarity_score,
    mention_found: textCheck.mention_found,
    hashtag_found: textCheck.hashtag_found,
    reach: reachCheck.actual_reach
  });
  
  // 4. Enviar notificaciones
  await sendEmail({
    to: promoter.email,
    template: 'free-pass-activated',
    data: {
      promoter_name: promoter.name,
      event_name: campaign.event.name,
      free_passes: freePasses,
      discount_code: campaign.discount_code,
      tracking_link: `https://eventflow.app/p/${promoter.unique_code}`
    }
  });
  
  await sendPushNotification({
    user_id: promoterId,
    title: '✅ Cortesías activadas',
    body: `Tus ${freePasses.length} entradas ya están listas`,
    action: 'view_tickets'
  });
  
  // 5. Notificar al admin/marketing manager
  await notifyProductora({
    campaign_id: campaignId,
    message: `${promoter.name} completó los requisitos. Free passes activados.`,
    type: 'promoter_approved'
  });
}

Email al promotor (aprobado):
Asunto: ✅ ¡Tus entradas están activadas!

Hola [Nombre],

¡Excelente! Tu contenido cumple todos los requisitos.

🎫 TUS ENTRADAS:
[QR Code 1]
Nombre: [Nombre del Promotor]
Tipo: Cortesía - Promotor

[QR Code 2]
Nombre: [Nombre del Promotor] +1
Tipo: Cortesía - Promotor

💰 TU CÓDIGO PARA COMPARTIR:
Código: PROMO-TECH-001
Descuento: 15% OFF
Link directo: https://eventflow.app/e/techno-underground?code=PROMO-TECH-001

📊 TRACKING EN TIEMPO REAL:
Mirá cuánta gente compra con tu código acá:
https://eventflow.app/p/dashboard

[Descargar entradas en PDF]
[Ver mi dashboard]

¡Nos vemos en el evento!


Si es RECHAZADO:
async function rejectSubmission(submissionId, reasons) {
  // 1. Actualizar estado
  await db.submissions.update(submissionId, {
    status: 'rejected',
    rejection_reasons: reasons,
    verified_at: new Date()
  });
  
  // 2. Enviar notificación con feedback específico
  await sendEmail({
    to: promoter.email,
    template: 'submission-rejected',
    data: {
      promoter_name: promoter.name,
      event_name: campaign.event.name,
      reasons: reasons,
      resubmit_link: `https://eventflow.app/promo/${uniqueCode}`,
      deadline: campaign.deadline
    }
  });
}

Email al promotor (rechazado):
Asunto: ⚠️ Tu contenido necesita algunos ajustes

Hola [Nombre],

Revisamos tu publicación pero hay algunos detalles que corregir:

❌ No detectamos el flyer del evento en tu publicación
   → Asegurate de que el flyer sea claramente visible

❌ Falta arrobar a @amnesia.productions
   → Agregá la mención en el caption o en la publicación

✅ Hashtag correcto (#TechnoUnderground)

No te preocupes, podés volver a intentarlo.

[RESUBIR CONTENIDO]

Deadline: 12/Dic 23:59hs

¿Dudas? Respondé este email.


PASO 4: Tracking de Conversiones
RF-012: Sistema de Códigos Únicos y Tracking
Generación de código:
function generatePromoterCode(promoterId, eventId) {
  // Formato: PROMO-[EVENT-ABBR]-[RANDOM]
  const eventAbbr = getEventAbbr(eventId); // "TECH", "HOUSE", etc
  const random = generateRandomString(3); // "A1B"
  
  return `PROMO-${eventAbbr}-${random}`;
}

Aplicación del descuento en checkout:
async function applyPromoCode(code, cartItems) {
  // 1. Validar código
  const promo = await db.promos.findByCode(code);
  
  if (!promo) {
    throw new Error('Código inválido');
  }
  
  if (promo.status !== 'active') {
    throw new Error('Código ya no válido');
  }
  
  if (promo.used_count >= promo.max_uses && promo.max_uses !== null) {
    throw new Error('Código agotado');
  }
  
  if (new Date() > new Date(promo.valid_until)) {
    throw new Error('Código expirado');
  }
  
  // 2. Calcular descuento
  const discount = calculateDiscount(cartItems, promo);
  
  // 3. Registrar uso (no incrementar counter aún, solo al completar compra)
  await db.promoUsageAttempts.create({
    promo_id: promo.id,
    session_id: sessionId,
    attempted_at: new Date()
  });
  
  return {
    code: promo.code,
    discount_type: promo.discount_type,
    discount_value: promo.discount_value,
    discount_amount: discount,
    final_amount: cartItems.total - discount
  };
}

Registro de conversión:
async function recordConversion(purchaseId, promoCode) {
  const promo = await db.promos.findByCode(promoCode);
  
  // 1. Incrementar contador de usos
  await db.promos.increment(promo.id, 'used_count', 1);
  
  // 2. Registrar conversión detallada
  await db.conversions.create({
    promo_id: promo.id,
    promoter_id: promo.promoter_id,
    campaign_id: promo.campaign_id,
    purchase_id: purchaseId,
    revenue_generated: purchase.total_amount,
    commission_amount: purchase.total_amount * promo.commission_rate,
    converted_at: new Date()
  });
  
  // 3. Actualizar métricas del promotor en tiempo real
  await updatePromoterMetrics(promo.promoter_id);
}


RF-013: Dashboard del Promotor
URL: https://eventflow.app/p/dashboard
Vista principal:
┌──────────────────────────────────────────────────┐
│ EventFlow Promotor                    [Logout]   │
├──────────────────────────────────────────────────┤
│                                                  │
│  👤 Bienvenido, [Nombre del Promotor]           │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ EVENTO ACTIVO: Techno Underground         │ │
│  │ 📅 15 de Diciembre, 22:00hs                │ │
│  │                                            │ │
│  │ 📊 TU PERFORMANCE:                         │ │
│  │                                            │ │
│  │ ✅ Estado: Verificado                      │ │
│  │ 📅 Verificado: 10/Dic 14:23                │ │
│  │                                            │ │
│  │ 🎫 FREE PASSES:                            │ │
│  │ ├─ Asignados: 2                            │ │
│  │ ├─ Canjeados: 1                            │ │
│  │ └─ Disponibles: 1                          │ │
│  │                                            │ │
│  │ 💰 CONVERSIONES:                           │ │
│  │ ├─ Código usado: 8 veces                   │ │
│  │ ├─ Revenue generado: $24.000               │ │
│  │ ├─ Tu comisión: $1.200 (5%)                │ │
│  │ └─ Estado: ⏳ Se paga post-evento          │ │
│  │                                            │ │
│  │ 📈 ALCANCE DE TU POST:                     │ │
│  │ ├─ Views: 3.2K                             │ │
│  │ ├─ Likes: 234                              │ │
│  │ ├─ Comentarios: 45                         │ │
│  │ └─ Tasa de conversión: 0.25%               │ │
│  │                                            │ │
│  │ [Ver mi post] [Compartir código]          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 📊 HISTORIAL (Todos los eventos)           │ │
│  ├────────────────────────────────────────────┤ │
│  │ Eventos: 12                                 │ │
│  │ Total conversiones: 89                      │ │
│  │ Revenue total: $267.000                     │ │
│  │ Comisiones totales: $13.350                 │ │
│  │ ROI promedio: 380%                          │ │
│  │ Rating: ⭐⭐⭐⭐⭐ (4.8/5)                    │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🔔 NUEVAS OPORTUNIDADES:                        │
│  • [House Vibes - 22/Dic] 2 free passes         │
│  • [Rave Sunrise - 29/Dic] 3 free passes        │
│                                                  │
└──────────────────────────────────────────────────┘

Actualización en tiempo real:
WebSocket para updates live de conversiones
Notificación push cuando alguien usa su código
Gráfico de conversiones por hora/día

PASO 5: Pago de Comisiones
RF-014: Cálculo y Pago Automático de Comisiones
Trigger: Post-evento (día siguiente automáticamente)
Proceso:
async function processPromoterPayments(eventId) {
  // 1. Obtener todas las campañas del evento
  const campaigns = await db.campaigns.findByEvent(eventId);
  
  for (const campaign of campaigns) {
    // 2. Obtener todos los promotores con conversiones
    const promoters = await db.conversions.getPromotersByCampaign(campaign.id);
    
    for (const promoter of promoters) {
      // 3. Calcular comisión total
      const totalCommission = await calculateTotalCommission(
        promoter.id,
        campaign.id
      );
      
      // 4. Crear registro de pago
      const payment = await db.payments.create({
        promoter_id: promoter.id,
        campaign_id: campaign.id,
        amount: totalCommission,
        status: 'pending',
        payment_method: campaign.payment_method,
        created_at: new Date()
      });
      
      // 5. Procesar pago según método
      if (campaign.payment_method === 'mercadopago') {
        await processMercadoPagoPayment(promoter, totalCommission);
      } else if (campaign.payment_method === 'bank_transfer') {
        await createBankTransferInstruction(promoter, totalCommission);
      }
      
      // 6. Notificar al promotor
      await sendEmail({
        to: promoter.email,
        template: 'commission-paid',
        data: {
          promoter_name: promoter.name,
          event_name: event.name,
          total_conversions: promoter.conversions_count,
          commission_amount: totalCommission
        }
      });
    }
  }
  
  // 7. Notificar al admin
  await notifyAdmin({
    event_id: eventId,
    message: `Comisiones procesadas para ${promoters.length} promotores`,
    total_amount: sumCommissions(promoters)
  });
}

Mercado Pago integration:
async function processMercadoPagoPayment(promoter, amount) {
  try {
    const payment = await mercadopago.payment.create({
      transaction_amount: amount,
      description: `Comisión evento ${event.name}`,
      payment_method_id: 'account_money',
      payer: {
        email: promoter.mercadopago_email || promoter.email
      }
    });
    
    await db.payments.update(paymentId, {
      status: 'completed',
      external_id: payment.id,
      processed_at: new Date()
    });
    
    return payment;
  } catch (error) {
    await db.payments.update(paymentId, {
      status: 'failed',
      error_message: error.message
    });
    
    // Notificar al admin para procesamiento manual
    await notifyAdmin({
      type: 'payment_failed',
      promoter_id: promoter.id,
      amount: amount,
      error: error.message
    });
  }
}


RF-015: Panel de Gestión para Admin/Marketing
Vista de campañas:
GESTIÓN DE CORTESÍAS

Evento: [Techno Underground ▼]

┌──────────────────────────────────────────────────┐
│ 📊 RESUMEN DE CAMPAÑA                            │
├──────────────────────────────────────────────────┤
│ Cortesías asignadas:     25                      │
│ Cortesías activadas:     18 (72%)                │
│ Pendientes verificación: 5                       │
│ Rechazadas:              2                       │
│                                                  │
│ 💰 ROI TOTAL:            412%                    │
│ Costo cortesías:         $50.000                 │
│ Ventas generadas:        $206.000                │
│ Comisiones a pagar:      $10.300                 │
│ Ganancia neta:           $145.700                │
└──────────────────────────────────────────────────┘

PROMOTORES:

┌──────────────────────────────────────────────────┐
│ 🥇 @promotor1                       ⭐⭐⭐⭐⭐ │
│ Estado: ✅ Verificado                            │
│ Conversiones: 15 | Revenue: $45.000              │
│ ROI: 680% | Comisión: $2.250                     │
│ [Ver detalles] [Pagar ahora]                     │
├──────────────────────────────────────────────────┤
│ 🥈 @promotor2                       ⭐⭐⭐⭐⚝ │
│ Estado: ✅ Verificado                            │
│ Conversiones: 12 | Revenue: $36.000              │
│ ROI: 520% | Comisión: $1.800                     │
│ [Ver detalles] [Pagar ahora]                     │
├──────────────────────────────────────────────────┤
│ ⚠️ @promotor3                       ⭐⭐⭐⚝⚝ │
│ Estado: ⏳ Pendiente verificación                │
│ Subido: Hace 1 hora                              │
│ [Revisar manualmente] [Contactar]               │
├──────────────────────────────────────────────────┤
│ ❌ @promotor4                       ⭐⭐⚝⚝⚝ │
│ Estado: ❌ Rechazado - Falta arrobar             │
│ Enviado: 09/Dic 18:45 | Puede reintentar        │
│ [Ver submission] [Reactivar]                     │
└──────────────────────────────────────────────────┘

[+ Agregar promotor] [Exportar reporte] [Pagar todos]


1.4 CASOS DE USO ADICIONALES
CU-001: Verificación Manual Override
Escenario: IA rechaza pero admin considera que debería aprobar
Flujo:
Admin ve submission rechazada en dashboard
Hace click en "Revisar manualmente"
Ve imagen/post original
Ve razones de rechazo de la IA
Puede aprobar manualmente con justificación
Sistema activa free passes y registra override en logs
async function manualOverride(submissionId, adminId, decision, reason) {
  await db.submissions.update(submissionId, {
    status: decision, // 'approved' o 'rejected'
    manual_override: true,
    override_by: adminId,
    override_reason: reason,
    override_at: new Date()
  });
  
  if (decision === 'approved') {
    await approveSubmission(submissionId, campaignId, promoterId);
  }
  
  // Log para auditoría
  await db.auditLogs.create({
    action: 'manual_override',
    entity_type: 'submission',
    entity_id: submissionId,
    admin_id: adminId,
    details: { decision, reason }
  });
}


CU-002: Promotor Resubmite Contenido
Escenario: Promotor corrige errores y vuelve a subir
Reglas:
Puede resubmitir hasta 3 veces
Cada resubmisión reinicia proceso de verificación
Si falla 3 veces, requiere aprobación manual

CU-003: Extensión de Deadline
Escenario: Productora extiende deadline para promotor específico
async function extendDeadline(campaignId, promoterId, newDeadline) {
  // Validar que nueva fecha sea antes del evento
  if (newDeadline >= event.start_date) {
    throw new Error('Deadline no puede ser después del evento');
  }
  
  await db.campaigns.updateDeadline(campaignId, promoterId, newDeadline);
  
  // Notificar al promotor
  await sendEmail({
    to: promoter.email,
    subject: 'Extensión de deadline',
    template: 'deadline-extended',
    data: {
      event_name: event.name,
      new_deadline: newDeadline
    }
  });
}


1.5 MÉTRICAS Y ANALYTICS
RF-016: Métricas Clave a Trackear
Por Campaña:
Tasa de activación (% de promotores que cumplen requisitos)
Tiempo promedio de verificación
Tasa de aprobación automática vs manual
ROI total de la campaña
Conversiones por promotor
Revenue generado vs costo de cortesías
Por Promotor:
Historial de participación
Tasa de conversión promedio
Revenue total generado
Rating (calculado automáticamente según performance)
Reliability score (cumple deadlines, calidad de contenido)
Globales:
Total de campañas activas
Total de promotores en red
Revenue total generado por cortesías
ROI promedio del sistema

1.6 INTEGRACIONES TÉCNICAS REQUERIDAS
APIs Necesarias:
Instagram Graph API


Propósito: Obtener datos de posts/stories
Permisos: instagram_basic, instagram_content_publish
Rate limit: 200 llamadas/hora
Google Cloud Vision API


Propósito: Detección de flyers en imágenes
Features: Image similarity, logo detection
Costo: ~$1.50 per 1000 imágenes
Google Cloud Vision OCR


Propósito: Extracción de texto de screenshots
Costo: ~$1.50 per 1000 imágenes
Mercado Pago API


Propósito: Pagos de comisiones
Endpoints: /v1/payments, /v1/transfers
SendGrid/Resend


Propósito: Emails transaccionales
Templates: 10+ templates específicos

1.7 MODELO DE DATOS
Tabla: campaigns
CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  productora_id UUID REFERENCES productoras(id),
  name VARCHAR(200),
  description TEXT,
  type VARCHAR(50), -- 'auto_verification', 'direct', 'discount_only'
  status VARCHAR(50), -- 'draft', 'active', 'paused', 'completed'
  free_passes_per_promoter INT DEFAULT 2,
  discount_code_template VARCHAR(50),
  discount_type VARCHAR(20), -- 'percentage', 'fixed'
  discount_value DECIMAL(10,2),
  commission_rate DECIMAL(5,2), -- 5.00 = 5%
  payment_method VARCHAR(50), -- 'mercadopago', 'bank_transfer'
  requirements JSONB, -- {requires_flyer, requires_mention, etc}
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

Tabla: campaign_promoters
CREATE TABLE campaign_promoters (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  promoter_id UUID REFERENCES users(id),
  unique_link_code VARCHAR(50) UNIQUE,
  discount_code VARCHAR(50) UNIQUE,
  free_passes_allocated INT,
  free_passes_used INT DEFAULT 0,
  status VARCHAR(50), -- 'pending_submission', 'pending_verification', 'approved', 'rejected'
  invited_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP,
  rejection_reasons JSONB
);

Tabla: promoter_submissions
CREATE TABLE promoter_submissions (
  id UUID PRIMARY KEY,
  campaign_promoter_id UUID REFERENCES campaign_promoters(id),
  submission_type VARCHAR(20), -- 'url', 'screenshot'
  content_url VARCHAR(500),
  screenshot_url VARCHAR(500),
  platform VARCHAR(50), -- 'instagram', 'tiktok'
  status VARCHAR(50), -- 'pending', 'approved', 'rejected'
  verification_results JSONB,
  manual_override BOOLEAN DEFAULT FALSE,
  override_by UUID REFERENCES users(id),
  override_reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW(),
  verified_at TIMESTAMP
);

Tabla: conversions
CREATE TABLE conversions (
  id UUID PRIMARY KEY,
  campaign_promoter_id UUID REFERENCES campaign_promoters(id),
  purchase_id UUID REFERENCES purchases(id),
  discount_code VARCHAR(50),
  revenue_generated DECIMAL(10,2),
  commission_amount DECIMAL(10,2),
  converted_at TIMESTAMP DEFAULT NOW()
);

Tabla: promoter_payments
CREATE TABLE promoter_payments (
  id UUID PRIMARY KEY,
  campaign_promoter_id UUID REFERENCES campaign_promoters(id),
  amount DECIMAL(10,2),
  payment_method VARCHAR(50),
  status VARCHAR(50), -- 'pending', 'processing', 'completed', 'failed'
  external_id VARCHAR(200), -- ID de Mercado Pago, etc
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);


1.8 ESTIMACIÓN DE COSTOS
Por campaña típica (20 promotores):
Recurso
Cantidad
Costo Unitario
Total
Vision API (detección)
20 imágenes
$0.0015/img
$0.03
OCR (screenshots)
~10 screenshots
$0.0015/img
$0.015
Instagram API
20 calls
Gratis
$0
Emails (notificaciones)
60 emails
$0.0001/email
$0.006
Mercado Pago (pagos)
20 transfers
1% fee
Variable
TOTAL por campaña




~$0.05 USD

Escalado (100 campañas/mes):
Costo operativo: ~$5 USD/mes
Negligible vs valor generado ($200K+ ARS de comisiones)

<a name="feature-2"></a>
FEATURE 2: IA CALCULADORA LOGÍSTICA
2.1 DESCRIPCIÓN GENERAL
Objetivo: Proporcionar cálculos precisos de recursos necesarios (bebidas, sonido, staff) para eventos, reduciendo sobrecostos del 15-30% causados por estimaciones incorrectas.
Alcance: Calculadora inteligente que aprende de eventos anteriores y ajusta recomendaciones según múltiples variables (género musical, clima, duración, etc).

2.2 ACTORES DEL SISTEMA
Actor
Descripción
Logística Manager
Usuario principal que usa la calculadora
Admin
Puede configurar parámetros y ver histórico
Sistema IA
Motor de cálculo y aprendizaje


2.3 INTERFAZ DE USUARIO
RF-017: Chat Interface de la Calculadora
Ubicación: Dashboard → Logística → Nueva Calculadora
Diseño conversacional:
┌──────────────────────────────────────────────────┐
│ 🤖 EventCalc - Asistente de Logística           │
├──────────────────────────────────────────────────┤
│                                                  │
│  EventCalc:                                      │
│  ┌────────────────────────────────────────────┐ │
│  │ ¡Hola! Voy a ayudarte a calcular todo lo  │ │
│  │ que necesitás para tu evento.              │ │
│  │                                            │ │
│  │ ¿Querés crear un cálculo desde cero o     │ │
│  │ basarte en un evento anterior?             │ │
│  │                                            │ │
│  │ [📝 Desde cero] [📂 Basado en histórico]  │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  [Escribe tu respuesta...] [Enviar]             │
│                                                  │
└──────────────────────────────────────────────────┘


RF-018: Flujo de Preguntas del Chat
PREGUNTA 1: Tipo de Evento
EventCalc:
┌────────────────────────────────────────────┐
│ ¿Qué tipo de evento vas a organizar?      │
│                                            │
│ [⚡ Techno]  [🎵 House]  [🔥 Trance]      │
│ [💎 Trap]    [🎉 Cachengue]  [✨ Otro]    │
└────────────────────────────────────────────┘

Datos guardados:
{
  event_type: "techno", // ID del género
  consumption_modifier: 1.3 // Techno consume +30% energizante
}


PREGUNTA 2: Cantidad de Personas
EventCalc:
┌────────────────────────────────────────────┐
│ ¿Cuántas personas esperás?                 │
│                                            │
│ 💡 Basándome en tus eventos anteriores    │
│ similares, solés tener entre 250-350      │
│ personas.                                  │
└────────────────────────────────────────────┘

Usuario:
[Ingresa número: 300]

EventCalc:
┌────────────────────────────────────────────┐
│ Perfecto, 300 personas. ¿Es una           │
│ estimación o ya tenés tickets vendidos?   │
│                                            │
│ [📊 Estimación]  [🎫 X tickets vendidos]  │
└────────────────────────────────────────────┘

Validaciones:
Número debe ser entre 50 y 5000
Si hay tickets vendidos, trae el número real del evento
Alerta si la estimación es muy diferente al histórico

PREGUNTA 3: Duración
EventCalc:
┌────────────────────────────────────────────┐
│ ¿Cuánto va a durar el evento?              │
│                                            │
│ Desde: [22:00 ▼] Hasta: [04:00 ▼]         │
│                                            │
│ Total: 6 horas                             │
│                                            │
│ ⚠️ Eventos techno de +6hs suelen tener    │
│ after hours. ¿Incluimos stock extra?      │
│ [Sí, agregar 20%]  [No, está bien así]    │
└────────────────────────────────────────────┘


PREGUNTA 4: Tipo de Venue
EventCalc:
┌────────────────────────────────────────────┐
│ ¿Dónde va a ser?                           │
│                                            │
│ [🏢 Cerrado] [🏛️ Semi-cerrado] [🌳 Aire libre] │
└────────────────────────────────────────────┘

[Usuario selecciona: Aire libre]

EventCalc:
┌────────────────────────────────────────────┐
│ Para eventos al aire libre necesito más   │
│ info. ¿Cuál es la fecha del evento?        │
│                                            │
│ [Calendario: 15/Diciembre/2026]            │
│                                            │
│ 🌡️ Temp. proyectada: 28°C (alta)         │
│ 🌧️ Probabilidad lluvia: 10% (baja)       │
│                                            │
│ Por la temperatura alta, voy a            │
│ recomendar +15% de agua y hielo.           │
└────────────────────────────────────────────┘

Integración con API de clima:
async function getWeatherForecast(date, location) {
  const forecast = await weatherAPI.getForecast({
    date: date,
    lat: location.lat,
    lon: location.lon
  });
  
  return {
    temperature: forecast.temp,
    precipitation_probability: forecast.pop,
    conditions: forecast.weather[0].main,
    recommendations: generateWeatherRecommendations(forecast)
  };
}

function generateWeatherRecommendations(forecast) {
  const recommendations = [];
  
  if (forecast.temp > 26) {
    recommendations.push({
      type: 'stock_increase',
      category: 'drinks',
      items: ['water', 'ice'],
      modifier: 1.15,
      reason: 'Temperatura alta aumenta consumo de agua'
    });
  }
  
  if (forecast.pop > 50) {
    recommendations.push({
      type: 'infrastructure',
      category: 'shelter',
      suggestion: 'Considerar carpas adicionales o plan B interior',
      reason: 'Alta probabilidad de lluvia'
    });
  }
  
  if (forecast.temp < 15) {
    recommendations.push({
      type: 'stock_decrease',
      category: 'cold_drinks',
      items: ['beer'],
      modifier: 0.90,
      reason: 'Temperatura baja reduce consumo de bebidas frías'
    });
  }
  
  return recommendations;
}


PREGUNTA 5: Layout del Evento
EventCalc:
┌────────────────────────────────────────────┐
│ ¿Cómo va a ser el layout?                  │
│                                            │
│ [🕺 Todo parado (pista de baile)]          │
│ [🪑 Mesas + pista]                         │
│ [🍽️ Solo mesas (sentados)]                │
└────────────────────────────────────────────┘

[Usuario selecciona: Todo parado]

EventCalc:
┌────────────────────────────────────────────┐
│ Perfecto. En eventos techno todo parado,  │
│ el consumo de bebidas es ~25% mayor que   │
│ en eventos con mesas.                      │
│                                            │
│ ¿Hay alguna info adicional que quieras    │
│ agregar? (Ej: público específico, tipo de │
│ barra, restricciones)                      │
│                                            │
│ [Continuar] [Agregar detalles]            │
└────────────────────────────────────────────┘


2.4 MOTOR DE CÁLCULO
RF-019: Algoritmo de Cálculo de Consumibles
Inputs del sistema:
{
  event_type: "techno",
  attendance: 300,
  duration_hours: 6,
  venue_type: "outdoor",
  layout: "standing",
  temperature: 28,
  date: "2026-12-15",
  historical_data: [...] // Eventos similares anteriores
}

Proceso de cálculo:
async function calculateResources(inputs) {
  // 1. Obtener baseline por tipo de evento
  const baseline = getBaselineConsumption(inputs.event_type);
  
  // 2. Ajustar por cantidad de personas
  let calculations = scaleByAttendance(baseline, inputs.attendance);
  
  // 3. Ajustar por duración
  calculations = adjustByDuration(calculations, inputs.duration_hours);
  
  // 4. Ajustar por venue type
  calculations = adjustByVenue(calculations, inputs.venue_type);
  
  // 5. Ajustar por layout
  calculations = adjustByLayout(calculations, inputs.layout);
  
  // 6. Ajustar por clima
  calculations = adjustByWeather(calculations, inputs.temperature);
  
  // 7. Aplicar ML si hay datos históricos
  if (inputs.historical_data.length >= 5) {
    calculations = applyMLAdjustments(calculations, inputs);
  }
  
  // 8. Agregar buffer de seguridad
  calculations = addSafetyBuffer(calculations, 0.10); // +10%
  
  return calculations;
}


Baseline de consumo (por 100 personas, 4 horas):
const BASELINE_CONSUMPTION = {
  techno: {
    beer: 120, // latas
    fernet: 18, // botellas 750ml
    vodka: 8,
    energizer: 90, // latas
    water: 60, // botellas 500ml
    juice: 40, // litros
    ice: 12, // kg
    cups: 300
  },
  house: {
    beer: 140,
    fernet: 15,
    vodka: 12,
    energizer: 60, // Menos que techno
    water: 50,
    juice: 50,
    ice: 10,
    cups: 300
  },
  cachengue: {
    beer: 150,
    fernet: 22, // Más que techno
    vodka: 6,
    energizer: 100, // Muy alto
    water: 70,
    juice: 30,
    ice: 15,
    cups: 350
  }
  // ... más géneros
};


Función de ajuste por duración:
function adjustByDuration(baseline, hours) {
  // No es lineal - consumo per capita baja después de 4hs
  const duracionFactor = {
    2: 0.6,
    3: 0.8,
    4: 1.0,  // baseline
    5: 1.15,
    6: 1.25,
    7: 1.30,
    8: 1.35
  };
  
  const factor = duracionFactor[hours] || (1.0 + (hours - 4) * 0.08);
  
  return Object.keys(baseline).reduce((acc, item) => {
    acc[item] = Math.ceil(baseline[item] * factor);
    return acc;
  }, {});
}


Función de ajuste por temperatura:
function adjustByWeather(calculations, temperature) {
  if (temperature > 25) {
    // Más calor = más bebidas frías
    calculations.beer *= 1.10;
    calculations.water *= 1.20;
    calculations.ice *= 1.15;
  } else if (temperature < 18) {
    // Menos calor = menos bebidas frías
    calculations.beer *= 0.95;
    calculations.water *= 0.90;
    calculations.ice *= 0.90;
  }
  
  return calculations;
}


RF-020: Cálculo de Sonido
function calculateSound(inputs) {
  const { attendance, venue_type, outdoor } = inputs;
  
  // Regla base: 40W por persona en cerrado, 50W en abierto
  const wattsPerPerson = venue_type === 'outdoor' ? 50 : 40;
  const totalWatts = attendance * wattsPerPerson;
  
  // Configuración recomendada
  const config = {
    total_power: totalWatts,
    line_arrays: Math.ceil(totalWatts / 6000), // 1 torre cada 6000W
    subwoofers: Math.ceil(attendance / 75), // 1 sub cada 75 personas
    monitors: 4, // Para DJ booth
    mixer: attendance > 500 ? 'professional' : 'standard',
    budget_range: {
      min: totalWatts * 15, // $15 por watt (low-end)
      max: totalWatts * 25  // $25 por watt (high-end)
    }
  };
  
  return config;
}


RF-021: Cálculo de Personal
function calculateStaff(inputs) {
  const { attendance, duration_hours, bars_count } = inputs;
  
  // Bartenders: 1 cada 50 personas por barra
  const bartendersPerBar = Math.ceil(attendance / 50);
  const totalBartenders = bartendersPerBar * (bars_count || 1);
  
  // Turnos si el evento dura +5hs
  const shifts = duration_hours > 5 ? 2 : 1;
  const bartendersNeeded = shifts > 1 ? 
    Math.ceil(totalBartenders * 1.5) : // +50% para cubrir turnos
    totalBartenders;
  
  // Seguridad: 1 cada 75 personas (mínimo 2)
  const security = Math.max(2, Math.ceil(attendance / 75));
  
  // Limpieza: 1 cada 150 personas
  const cleaning = Math.ceil(attendance / 150);
  
  // Producción: fijo según tamaño
  const production = attendance > 500 ? 4 : 
                    attendance > 250 ? 3 : 2;
  
  return {
    bartenders: bartendersNeeded,
    bartenders_per_shift: Math.ceil(bartendersNeeded / shifts),
    shifts: shifts,
    security: security,
    cleaning: cleaning,
    production: production,
    total: bartendersNeeded + security + cleaning + production
  };
}


RF-022: Cálculo Financiero
async function calculateFinancials(resources, soundConfig, staff) {
  // 1. Obtener precios actuales de proveedores
  const prices = await getPricing();
  
  // 2. Calcular costos
  const costs = {
    consumables: calculateConsumablesCost(resources, prices),
    sound: soundConfig.budget_range.min, // Usar mínimo por default
    staff: calculateStaffCost(staff, prices.labor_rates),
    infrastructure: 0, // Se calcula según venue_type
    other: 0
  };
  
  costs.total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
  
  // 3. Calcular breakeven
  const ticketPrice = inputs.estimated_ticket_price || 3000;
  const breakeven = Math.ceil(costs.total / (ticketPrice * 0.7)); // 70% después de comisiones
  
  // 4. Proyectar ganancias
  const projections = [
    {
      scenario: 'optimista',
      attendance: inputs.attendance * 1.2,
      revenue: inputs.attendance * 1.2 * ticketPrice,
      profit: (inputs.attendance * 1.2 * ticketPrice) - costs.total,
      margin: ((((inputs.attendance * 1.2 * ticketPrice) - costs.total) / (inputs.attendance * 1.2 * ticketPrice)) * 100).toFixed(1)
    },
    {
      scenario: 'realista',
      attendance: inputs.attendance,
      revenue: inputs.attendance * ticketPrice,
      profit: (inputs.attendance * ticketPrice) - costs.total,
      margin: ((((inputs.attendance * ticketPrice) - costs.total) / (inputs.attendance * ticketPrice)) * 100).toFixed(1)
    },
    {
      scenario: 'pesimista',
      attendance: inputs.attendance * 0.8,
      revenue: inputs.attendance * 0.8 * ticketPrice,
      profit: (inputs.attendance * 0.8 * ticketPrice) - costs.total,
      margin: ((((inputs.attendance * 0.8 * ticketPrice) - costs.total) / (inputs.attendance * 0.8 * ticketPrice)) * 100).toFixed(1)
    }
  ];
  
  return {
    costs,
    breakeven_tickets: breakeven,
    projections
  };
}


2.5 PRESENTACIÓN DE RESULTADOS
RF-023: Vista de Resultados
┌──────────────────────────────────────────────────┐
│ 📊 REPORTE DE LOGÍSTICA                          │
│ Evento Techno - 300 personas - 6 horas           │
├──────────────────────────────────────────────────┤
│                                                  │
│  🍺 CONSUMIBLES                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ Bebidas Alcohólicas:                       │ │
│  │ • Cerveza: 250 latas                       │ │
│  │ • Fernet: 35 botellas (750ml)              │ │
│  │ • Vodka: 15 botellas (750ml)               │ │
│  │                                            │ │
│  │ Bebidas Sin Alcohol:                       │ │
│  │ • Energizantes: 180 latas ⚡               │ │
│  │   (Techno consume +30% vs otros géneros)   │ │
│  │ • Agua: 150 botellas (500ml)               │ │
│  │ • Jugos: 80 litros                         │ │
│  │                                            │ │
│  │ Otros:                                     │ │
│  │ • Hielo: 25kg                              │ │
│  │ • Vasos: 700 unidades                      │ │
│  │ • Limones: 5kg                             │ │
│  │                                            │ │
│  │ 💰 Costo estimado: $285.000                │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🔊 SONIDO E ILUMINACIÓN                         │
│  ┌────────────────────────────────────────────┐ │
│  │ Sistema recomendado:                       │ │
│  │ • Potencia total: 15.000W                  │ │
│  │ • Line arrays: 3 torres                    │ │
│  │ • Subwoofers: 4 unidades                   │ │
│  │ • Monitores DJ: 4 unidades                 │ │
│  │ • Mixer: Profesional (evento +250 personas)│ │
│  │                                            │ │
│  │ 💰 Presupuesto: $225.000 - $375.000        │ │
│  │                                            │ │
│  │ 🔗 [Ver proveedores recomendados]          │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  👥 PERSONAL NECESARIO                           │
│  ┌────────────────────────────────────────────┐ │
│  │ • Bartenders: 9 personas                   │ │
│  │   └─ Turnos: 2 turnos de 3hs c/u           │ │
│  │   └─ 5 personas por turno                  │ │
│  │ • Seguridad: 4 personas                    │ │
│  │ • Limpieza: 2 personas                     │ │
│  │ • Producción: 3 coordinadores              │ │
│  │                                            │ │
│  │ 💰 Costo estimado: $180.000                │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  💰 RESUMEN FINANCIERO                           │
│  ┌────────────────────────────────────────────┐ │
│  │ Costo Total Estimado: $450.000             │ │
│  │ ├─ Consumibles: $285.000 (63%)             │ │
│  │ ├─ Sonido: $225.000 (50%)                  │ │
│  │ ├─ Staff: $180.000 (40%)                   │ │
│  │ └─ Otros: $60.000 (13%)                    │ │
│  │                                            │ │
│  │ Breakeven: 180 tickets @ $3.000            │ │
│  │                                            │ │
│  │ Proyección de Ganancia:                    │ │
│  │ • Optimista (360 tickets): $630.000 (58%)  │ │
│  │ • Realista (300 tickets): $360.000 (44%)   │ │
│  │ • Pesimista (240 tickets): $90.000 (11%)   │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  🤖 RECOMENDACIONES IA                           │
│  ┌────────────────────────────────────────────┐ │
│  │ ⚠️ Basado en eventos techno similares:     │ │
│  │                                            │ │
│  │ • El 15% de asistentes llega 2hs tarde.   │ │
│  │   Considerá abrir barras progresivamente.  │ │
│  │                                            │ │
│  │ • Temperatura alta (28°C): agregá +20%     │ │
│  │   de agua e hielo sobre la recomendación.  │ │
│  │                                            │ │
│  │ • En tu último evento techno similar       │ │
│  │   te quedaste sin energizante. Esta vez    │ │
│  │   agregué un buffer del 15%.               │ │
│  └────────────────────────────────────────────┘ │
│                                                  │
│  [💾 Guardar reporte] [📧 Enviar por email]     │
│  [🔄 Ajustar parámetros] [📋 Exportar PDF]      │
└──────────────────────────────────────────────────┘


2.6 APRENDIZAJE AUTOMÁTICO
RF-024: Sistema de Feedback Post-Evento
Al finalizar el evento, el sistema solicita feedback real:
Post-Evento: ¿Cómo fue el consumo real?

Consumibles:
├─ Cerveza: Proyectado 250 | Real: [240] ✅ 96%
├─ Fernet: Proyectado 35 | Real: [33] ✅ 94%
├─ Energizante: Proyectado 180 | Real: [195] ⚠️ 108%

¿Hubo algún imprevisto?
[Textarea para comentarios]

[Guardar feedback]

Proceso de aprendizaje:
async function updateMLModel(eventId, feedback) {
  const prediction = await db.predictions.findByEvent(eventId);
  const actual = feedback.actual_consumption;
  
  // Calcular error
  const errors = {};
  Object.keys(prediction).forEach(item => {
    errors[item] = (actual[item] - prediction[item]) / prediction[item];
  });
  
  // Actualizar modelo
  await ml.trainIncremental({
    features: prediction.input_features,
    target: actual,
    errors: errors
  });
  
  // Guardar para futuras predicciones
  await db.learningData.create({
    event_id: eventId,
    predicted: prediction,
    actual: actual,
    accuracy: calculateAccuracy(errors)
  });
}


2.7 INTEGRACIONES
APIs necesarias:
OpenWeatherMap API (clima)
Base de datos de proveedores
Histórico de eventos de la productora
Modelo de datos:
CREATE TABLE logistics_calculations (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES events(id),
  created_by UUID REFERENCES users(id),
  input_parameters JSONB,
  calculated_resources JSONB,
  sound_config JSONB,
  staff_requirements JSONB,
  financial_summary JSONB,
  actual_consumption JSONB, -- Se llena post-evento
  accuracy_score DECIMAL(5,2), -- Se calcula post-evento
  created_at TIMESTAMP DEFAULT NOW()
);


<a name="feature-3"></a>
FEATURE 3: GENERADOR DE FLYERS CON IA
3.1 DESCRIPCIÓN
Objetivo: Permitir a diseñadores generar flyers profesionales en minutos usando IA, manteniendo consistencia con la marca.

3.2 FUNCIONALIDADES PRINCIPALES
RF-025: Formulario de Brief
{
  event_name: "Techno Underground Vol. 5",
  genre: "techno",
  date: "2026-12-15",
  time: "22:00",
  venue: "Av. Liniers 2466, Tigre",
  artists: ["Tale of Us", "Mind Against", "Local Support"],
  vibe: "dark_industrial", // dark, colorful, elegant, retro
  keywords: ["underground", "warehouse", "rave"],
  reference_image_url: null // opcional
}

RF-026: Generación con IA
async function generateFlyers(brief) {
  // 1. Cargar brand guidelines
  const brandGuidelines = await getBrandGuidelines(productoraId);
  
  // 2. Generar prompt para IA
  const prompt = buildPrompt(brief, brandGuidelines);
  
  // 3. Generar 3 variantes
  const variants = await Promise.all([
    imageAI.generate(prompt, { seed: 1, style: 'dark' }),
    imageAI.generate(prompt, { seed: 2, style: 'bold' }),
    imageAI.generate(prompt, { seed: 3, style: 'minimal' })
  ]);
  
  return variants;
}

function buildPrompt(brief, brand) {
  return `
    Event flyer design for ${brief.event_name}
    Genre: ${brief.genre}
    Style: ${brief.vibe}
    Colors: ${brand.colors.join(', ')}
    Typography: ${brand.fonts.heading}
    Keywords: ${brief.keywords.join(', ')}
    Layout: Professional, modern, edgy
    Include text placeholders for: event name, date, location, artists
  `;
}

RF-027: Editor Visual
Elementos editables:
Textos (click to edit)
Colores (color picker)
Posiciones (drag & drop)
Imágenes (replace)
Tamaño de elementos
RF-028: Exportación Multi-Formato
async function exportFlyer(design, formats) {
  const exports = {};
  
  for (const format of formats) {
    switch(format) {
      case 'ig_story':
        exports[format] = await resize(design, 1080, 1920);
        break;
      case 'ig_post':
        exports[format] = await resize(design, 1080, 1080);
        break;
      case 'fb_event':
        exports[format] = await resize(design, 1920, 1080);
        break;
      case 'print_a3':
        exports[format] = await resize(design, 3508, 4961, { dpi: 300 });
        break;
    }
  }
  
  return exports;
}


<a name="feature-4"></a>
FEATURE 4: SISTEMA DE ROLES Y PERMISOS
4.1 DESCRIPCIÓN
Objetivo: Permitir que diferentes miembros del equipo accedan solo a las funcionalidades relevantes para su rol.

4.2 DEFINICIÓN DE ROLES
RF-029: Roles y Permisos
const ROLES = {
  ADMIN: {
    name: 'Administrador',
    permissions: [
      'view_all',
      'edit_all',
      'delete_all',
      'manage_users',
      'approve_expenses',
      'view_financials',
      'configure_productora'
    ],
    dashboard: 'admin_executive'
  },
  
  DESIGNER: {
    name: 'Diseñador',
    permissions: [
      'create_flyers',
      'edit_flyers',
      'view_brand_manual',
      'edit_brand_manual',
      'view_assets_library',
      'upload_assets'
    ],
    dashboard: 'designer'
  },
  
  MARKETING: {
    name: 'Marketing y Ventas',
    permissions: [
      'create_campaigns',
      'manage_promoters',
      'view_analytics',
      'send_communications',
      'view_crm',
      'create_discounts'
    ],
    dashboard: 'marketing'
  },
  
  LOGISTICS: {
    name: 'Logística',
    permissions: [
      'use_calculator',
      'manage_suppliers',
      'view_checklists',
      'manage_inventory'
    ],
    dashboard: 'logistics'
  },
  
  FINANCE: {
    name: 'Finanzas',
    permissions: [
      'view_financials',
      'manage_payments',
      'generate_reports',
      'manage_invoices'
    ],
    dashboard: 'finance'
  },
  
  STAFF: {
    name: 'Staff/Barra',
    permissions: [
      'scan_tickets',
      'validate_entries',
      'view_event_checklist'
    ],
    dashboard: 'staff'
  }
};

RF-030: Asignación de Roles
async function assignRole(userId, role, productoraId) {
  // Validar que el rol exista
  if (!ROLES[role]) {
    throw new Error('Rol inválido');
  }
  
  // Asignar rol
  await db.userRoles.create({
    user_id: userId,
    productora_id: productoraId,
    role: role,
    assigned_at: new Date()
  });
  
  // Enviar notificación de bienvenida con tutorial
  await sendOnboardingEmail(userId, role);
}

RF-031: Middleware de Autorización
function requirePermission(permission) {
  return async (req, res, next) => {
    const userRole = await getUserRole(req.user.id, req.productora.id);
    
    if (!ROLES[userRole].permissions.includes(permission)) {
      return res.status(403).json({
        error: 'No tenés permisos para esta acción'
      });
    }
    
    next();
  };
}

// Uso:
router.post('/campaigns', 
  requirePermission('create_campaigns'),
  createCampaign
);


<a name="feature-5"></a>
FEATURE 5: SISTEMA DE LEALTAD
5.1 DESCRIPCIÓN
Objetivo: Incentivar asistencia recurrente con beneficios automáticos escalonados.

5.2 TIERS Y BENEFICIOS
RF-032: Definición de Tiers
const LOYALTY_TIERS = {
  BRONZE: {
    name: 'Bronze',
    min_events: 0,
    max_events: 5,
    benefits: {
      discount: 0,
      free_drink: false,
      early_access: false,
      priority_queue: false
    },
    badge_color: '#CD7F32'
  },
  
  SILVER: {
    name: 'Silver',
    min_events: 6,
    max_events: 15,
    benefits: {
      discount: 10, // 10% en early birds
      free_drink: false,
      early_access: true, // 24hs antes
      priority_queue: false
    },
    badge_color: '#C0C0C0'
  },
  
  GOLD: {
    name: 'Gold',
    min_events: 16,
    max_events: 30,
    benefits: {
      discount: 15, // 15% permanente
      free_drink: true, // 1 por evento
      early_access: true,
      priority_queue: true
    },
    badge_color: '#FFD700'
  },
  
  PLATINUM: {
    name: 'Platinum',
    min_events: 31,
    max_events: Infinity,
    benefits: {
      discount: 20,
      free_drink: true,
      free_guest: true, // 1 invitado cada 5 eventos
      early_access: true,
      priority_queue: true,
      exclusive_events: true,
      meet_and_greet: true
    },
    badge_color: '#E5E4E2'
  }
};

RF-033: Cálculo Automático de Tier
async function calculateUserTier(userId, productoraId) {
  // Contar eventos asistidos
  const eventsAttended = await db.tickets.countValidatedByUser(
    userId,
    productoraId
  );
  
  // Determinar tier
  let tier = 'BRONZE';
  for (const [tierName, tierData] of Object.entries(LOYALTY_TIERS)) {
    if (eventsAttended >= tierData.min_events && 
        eventsAttended <= tierData.max_events) {
      tier = tierName;
      break;
    }
  }
  
  return {
    tier: tier,
    events_count: eventsAttended,
    benefits: LOYALTY_TIERS[tier].benefits,
    next_tier: getNextTier(tier),
    events_to_next: calculateEventsToNext(eventsAttended, tier)
  };
}

RF-034: Aplicación Automática de Beneficios
async function applyLoyaltyBenefits(userId, cart) {
  const loyalty = await calculateUserTier(userId, cart.productora_id);
  
  // Aplicar descuento
  if (loyalty.benefits.discount > 0) {
    cart.discount = cart.subtotal * (loyalty.benefits.discount / 100);
    cart.discount_reason = `Descuento ${loyalty.tier} ${loyalty.benefits.discount}%`;
  }
  
  // Registrar trago gratis si aplica
  if (loyalty.benefits.free_drink) {
    await db.loyaltyPerks.create({
      user_id: userId,
      event_id: cart.event_id,
      perk_type: 'free_drink',
      claimed: false
    });
  }
  
  return cart;
}

RF-035: Notificación de Upgrade
async function checkTierUpgrade(userId, productoraId) {
  const previousTier = await db.userTiers.getLatest(userId, productoraId);
  const currentTier = await calculateUserTier(userId, productoraId);
  
  if (currentTier.tier !== previousTier.tier) {
    // Upgrade!
    await db.userTiers.create({
      user_id: userId,
      productora_id: productoraId,
      tier: currentTier.tier,
      achieved_at: new Date()
    });
    
    // Notificar
    await sendEmail({
      to: user.email,
      template: 'tier-upgrade',
      data: {
        name: user.name,
        new_tier: currentTier.tier,
        benefits: LOYALTY_TIERS[currentTier.tier].benefits
      }
    });
    
    await sendPushNotification({
      user_id: userId,
      title: `🎉 ¡Subiste a ${currentTier.tier}!`,
      body: `Desbloqueaste nuevos beneficios`,
      action: 'view_benefits'
    });
  }
}


<a name="feature-6"></a>
FEATURE 6: VALIDACIÓN QR OFFLINE
6.1 DESCRIPCIÓN
Objetivo: Permitir validación de tickets sin conexión a internet, crítico para boliches con mala señal.

6.2 ARQUITECTURA TÉCNICA
RF-036: Generación de Tickets con NFT Backend
async function generateTicket(purchase, ticketType) {
  // Generar QR único
  const qrData = {
    ticket_id: uuid(),
    event_id: purchase.event_id,
    user_id: purchase.user_id,
    ticket_type_id: ticketType.id,
    timestamp: Date.now()
  };
  
  // Crear hash de seguridad
  const securityHash = await crypto.createHash('sha256')
    .update(JSON.stringify(qrData) + process.env.SECRET_SALT)
    .digest('hex');
  
  // Opcional: Crear NFT en Polygon (invisible para usuario)
  const nftId = await createTicketNFT({
    ticket_id: qrData.ticket_id,
    event_id: qrData.event_id,
    metadata: qrData
  });
  
  // Guardar ticket
  await db.tickets.create({
    ...qrData,
    security_hash: securityHash,
    nft_token_id: nftId,
    status: 'valid',
    qr_code: generateQRCode(qrData)
  });
  
  return qrData.ticket_id;
}

RF-037: Sincronización Pre-Evento
// App móvil del staff
async function syncEventData(eventId) {
  // Descargar todos los tickets válidos
  const tickets = await api.getEventTickets(eventId);
  
  // Guardar en IndexedDB (offline storage)
  await indexedDB.tickets.bulkPut(tickets);
  
  // Guardar metadata
  await indexedDB.events.put({
    id: eventId,
    synced_at: new Date(),
    total_tickets: tickets.length
  });
  
  return {
    success: true,
    tickets_synced: tickets.length
  };
}

RF-038: Validación Offline
async function validateTicketOffline(qrCode) {
  // 1. Parsear QR
  const ticketData = parseQRCode(qrCode);
  
  // 2. Verificar hash de seguridad
  const expectedHash = await crypto.createHash('sha256')
    .update(JSON.stringify(ticketData) + process.env.SECRET_SALT)
    .digest('hex');
  
  if (ticketData.hash !== expectedHash) {
    return {
      valid: false,
      reason: 'QR inválido o adulterado'
    };
  }
  
  // 3. Buscar en base local
  const ticket = await indexedDB.tickets.get(ticketData.ticket_id);
  
  if (!ticket) {
    return {
      valid: false,
      reason: 'Ticket no encontrado',
      requires_online: true // Intentar online
    };
  }
  
  if (ticket.status !== 'valid') {
    return {
      valid: false,
      reason: ticket.status === 'used' ? 'Ticket ya usado' : 'Ticket cancelado'
    };
  }
  
  // 4. Marcar como usado
  await indexedDB.tickets.update(ticketData.ticket_id, {
    status: 'used',
    validated_at: new Date(),
    validated_by: currentStaffId,
    sync_pending: true // Flag para sincronizar después
  });
  
  return {
    valid: true,
    ticket: ticket,
    user_name: ticket.user_name,
    ticket_type: ticket.ticket_type_name
  };
}

RF-039: Sincronización Post-Validación
// Cada 5 minutos o cuando hay conexión
async function syncValidations() {
  const pendingSync = await indexedDB.tickets.where('sync_pending').equals(true).toArray();
  
  if (pendingSync.length === 0) return;
  
  try {
    // Enviar en batch
    const result = await api.bulkUpdateTickets(pendingSync);
    
    // Marcar como sincronizados
    await Promise.all(pendingSync.map(ticket =>
      indexedDB.tickets.update(ticket.id, { sync_pending: false })
    ));
    
    return { synced: pendingSync.length };
  } catch (error) {
    // Reintentar después
    console.error('Sync failed:', error);
  }
}

RF-040: UI de Validación
┌──────────────────────────────────────┐
│ EventFlow Staff                      │
│ Evento: Techno Underground           │
│ Staff: Juan Pérez                    │
├──────────────────────────────────────┤
│                                      │
│  📊 ESTADÍSTICAS                     │
│  ┌────────────────────────────────┐ │
│  │ Ingresos: 234 / 300 (78%)      │ │
│  │ Última sincronización: Hace 2m │ │
│  │ 📶 Modo: OFFLINE               │ │
│  └────────────────────────────────┘ │
│                                      │
│  📷 ESCÁNER QR                       │
│  ┌────────────────────────────────┐ │
│  │                                │ │
│  │     [Cámara activa]            │ │
│  │                                │ │
│  │  Apuntá al código QR           │ │
│  │                                │ │
│  └────────────────────────────────┘ │
│                                      │
│  [Ingresar código manual]           │
│                                      │
└──────────────────────────────────────┘

Feedback de validación:
✅ TICKET VÁLIDO
┌────────────────────────────────────┐
│ Nombre: Juan Martínez              │
│ Tipo: VIP                          │
│ Mesa: 15                           │
│                                    │
│ 🎁 Beneficios:                     │
│ • 1 trago gratis (Gold tier)       │
│                                    │
│ [✓ PERMITIR INGRESO]               │
└────────────────────────────────────┘

❌ TICKET INVÁLIDO
┌────────────────────────────────────┐
│ ⚠️ TICKET YA USADO                 │
│                                    │
│ Usado: 15/Dic 23:45                │
│ Por: Staff María González          │
│                                    │
│ [RECHAZAR] [Reportar problema]     │
└────────────────────────────────────┘


<a name="integraciones"></a>
7. INTEGRACIONES TÉCNICAS
7.1 APIS EXTERNAS
Servicio
Propósito
Costo Estimado
OpenAI GPT-4
Procesamiento texto, recomendaciones
$0.01-0.03/1K tokens
Midjourney/DALL-E
Generación de flyers
$0.02-0.04/imagen
Google Cloud Vision
Detección flyers, OCR
$1.50/1K imágenes
Instagram Graph API
Verificación posts
Gratis (rate limited)
Mercado Pago
Pagos y liquidaciones
1-3% por transacción
OpenWeatherMap
Pronóstico climático
Gratis hasta 1K calls/día
SendGrid/Resend
Emails transaccionales
$0.0001/email
Twilio
SMS/WhatsApp
$0.0075/SMS
Polygon Network
NFTs de tickets
~$0.01/transacción

7.2 INFRAESTRUCTURA
Base de datos: PostgreSQL + Supabase Storage: Supabase Storage / Cloudflare R2 Hosting: Vercel (frontend) + Railway (backend) Queue: BullMQ + Redis Realtime: Supabase Realtime / WebSockets CDN: Cloudflare

<a name="modelo-datos"></a>
8. MODELO DE DATOS PRINCIPAL
Tablas Core
-- Productoras
CREATE TABLE productoras (
  id UUID PRIMARY KEY,
  name VARCHAR(200),
  owner_id UUID REFERENCES users(id),
  brand_guidelines JSONB,
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Usuarios y Roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  productora_id UUID REFERENCES productoras(id),
  role VARCHAR(50), -- admin, designer, marketing, etc
  permissions JSONB,
  assigned_at TIMESTAMP DEFAULT NOW()
);

-- Eventos
CREATE TABLE events (
  id UUID PRIMARY KEY,
  productora_id UUID REFERENCES productoras(id),
  name VARCHAR(200),
  genre VARCHAR(50),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  venue_type VARCHAR(50),
  capacity INT,
  status VARCHAR(50),
  flyer_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calculadora Logística (ver sección 2.7)
-- Campañas de Cortesías (ver sección 1.7)
-- Tickets y Validaciones (ver sección 6.1)

-- Sistema de Lealtad
CREATE TABLE user_loyalty (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  productora_id UUID REFERENCES productoras(id),
  events_attended INT DEFAULT 0,
  current_tier VARCHAR(50),
  tier_achieved_at TIMESTAMP,
  total_spent DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE loyalty_perks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  event_id UUID REFERENCES events(id),
  perk_type VARCHAR(50), -- free_drink, free_guest, etc
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP
);
