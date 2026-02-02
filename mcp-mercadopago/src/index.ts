#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

// Inicializar cliente de Mercado Pago
const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || '';
const client = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: 5000,
  },
});

const preferenceClient = new Preference(client);

// Crear servidor MCP
const server = new Server(
  {
    name: 'mercadopago-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Listar herramientas disponibles
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'verify_credentials',
      description: 'Verifica que las credenciales de Mercado Pago sean válidas y obtiene información sobre el tipo de token (sandbox/producción)',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'create_test_preference',
      description: 'Crea una preferencia de pago de prueba en Mercado Pago para verificar que la integración funciona correctamente',
      inputSchema: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Monto de la preferencia de prueba',
            default: 100,
          },
          description: {
            type: 'string',
            description: 'Descripción del pago de prueba',
            default: 'Test Payment',
          },
        },
      },
    },
    {
      name: 'get_preference_info',
      description: 'Obtiene información detallada de una preferencia de pago por su ID',
      inputSchema: {
        type: 'object',
        properties: {
          preferenceId: {
            type: 'string',
            description: 'ID de la preferencia de pago',
          },
        },
        required: ['preferenceId'],
      },
    },
    {
      name: 'get_payment_info',
      description: 'Obtiene información detallada de un pago por su ID',
      inputSchema: {
        type: 'object',
        properties: {
          paymentId: {
            type: 'string',
            description: 'ID del pago',
          },
        },
        required: ['paymentId'],
      },
    },
    {
      name: 'check_sandbox_status',
      description: 'Verifica si el token está configurado para sandbox y si puede crear preferencias de prueba',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'diagnose_integration',
      description: 'Ejecuta un diagnóstico completo de la integración con Mercado Pago, verificando credenciales, conexión y capacidad de crear preferencias',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
}));

// Manejar llamadas a herramientas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'verify_credentials': {
        if (!accessToken) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: 'MERCADOPAGO_ACCESS_TOKEN no está configurado',
                  status: 'error',
                }, null, 2),
              },
            ],
          };
        }

        const isTest = accessToken.startsWith('TEST-');
        const isProd = accessToken.startsWith('APP_USR-');

        // Intentar crear una preferencia mínima para verificar
        try {
          const testPreference = await preferenceClient.create({
            body: {
              items: [
                {
                  id: 'test',
                  title: 'Test',
                  quantity: 1,
                  unit_price: 1,
                },
              ],
            },
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  tokenType: isTest ? 'sandbox' : isProd ? 'production' : 'unknown',
                  tokenPrefix: accessToken.substring(0, 20) + '...',
                  tokenLength: accessToken.length,
                  canCreatePreferences: true,
                  hasSandboxUrl: !!testPreference.sandbox_init_point,
                  hasProdUrl: !!testPreference.init_point,
                  testPreferenceId: testPreference.id,
                  message: 'Credenciales válidas y funcionando correctamente',
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  tokenType: isTest ? 'sandbox' : isProd ? 'production' : 'unknown',
                  tokenPrefix: accessToken.substring(0, 20) + '...',
                  error: error.message,
                  errorCode: error.status || error.statusCode,
                  message: 'Error al verificar credenciales con la API de Mercado Pago',
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'create_test_preference': {
        const amount = (args as any)?.amount || 100;
        const description = (args as any)?.description || 'Test Payment';

        try {
          const preference = await preferenceClient.create({
            body: {
              items: [
                {
                  id: 'test-item',
                  title: description,
                  quantity: 1,
                  unit_price: amount,
                },
              ],
              back_urls: {
                success: 'https://example.com/success',
                failure: 'https://example.com/failure',
                pending: 'https://example.com/pending',
              },
            },
          });

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  preferenceId: preference.id,
                  sandboxInitPoint: preference.sandbox_init_point,
                  initPoint: preference.init_point,
                  recommendedUrl: preference.sandbox_init_point || preference.init_point,
                  hasSandboxUrl: !!preference.sandbox_init_point,
                  hasProdUrl: !!preference.init_point,
                  message: 'Preferencia de prueba creada exitosamente',
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  error: error.message,
                  errorCode: error.status || error.statusCode,
                  errorDetails: error.cause || error.response,
                  message: 'Error al crear preferencia de prueba',
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'get_preference_info': {
        const preferenceId = (args as any)?.preferenceId;
        if (!preferenceId) {
          throw new McpError(
            ErrorCode.InvalidParams,
            'preferenceId es requerido'
          );
        }

        try {
          const preference = await preferenceClient.get({ id: preferenceId } as any);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  preferenceId: (preference as any).id,
                  items: (preference as any).items,
                  payer: (preference as any).payer,
                  backUrls: (preference as any).back_urls,
                  sandboxInitPoint: (preference as any).sandbox_init_point,
                  initPoint: (preference as any).init_point,
                  created: (preference as any).date_created,
                  updated: (preference as any).last_updated,
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  error: error.message,
                  errorCode: error.status || error.statusCode,
                  message: 'Error al obtener información de la preferencia',
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'get_payment_info': {
        const paymentId = (args as any)?.paymentId;
        if (!paymentId) {
          throw new McpError(ErrorCode.InvalidParams, 'paymentId es requerido');
        }

        try {
          const paymentResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/${paymentId}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!paymentResponse.ok) {
            const errorData = await paymentResponse.text();
            throw new Error(`Error ${paymentResponse.status}: ${errorData}`);
          }

          const payment: any = await paymentResponse.json();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  paymentId: payment.id,
                  paymentStatus: payment.status,
                  statusDetail: payment.status_detail,
                  transactionAmount: payment.transaction_amount,
                  currency: payment.currency_id,
                  paymentMethod: payment.payment_method_id,
                  dateCreated: payment.date_created,
                  dateApproved: payment.date_approved,
                  externalReference: payment.external_reference,
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  error: error.message,
                  message: 'Error al obtener información del pago',
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'check_sandbox_status': {
        try {
          const testPreference = await preferenceClient.create({
            body: {
              items: [
                {
                  id: 'sandbox-test',
                  title: 'Sandbox Test',
                  quantity: 1,
                  unit_price: 1,
                },
              ],
            },
          });

          const isSandbox = !!testPreference.sandbox_init_point;
          const isProduction = !!testPreference.init_point;

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'success',
                  isSandboxAvailable: isSandbox,
                  isProductionAvailable: isProduction,
                  recommendedEnvironment: isSandbox ? 'sandbox' : 'production',
                  sandboxUrl: testPreference.sandbox_init_point,
                  productionUrl: testPreference.init_point,
                  tokenType: accessToken.startsWith('TEST-')
                    ? 'sandbox'
                    : accessToken.startsWith('APP_USR-')
                    ? 'production'
                    : 'unknown',
                  message: isSandbox
                    ? 'Token configurado para sandbox. Usa sandbox_init_point para pagos de prueba.'
                    : 'Token no genera URLs de sandbox. Verifica que sea un token de prueba válido.',
                }, null, 2),
              },
            ],
          };
        } catch (error: any) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  status: 'error',
                  error: error.message,
                  errorCode: error.status || error.statusCode,
                  message: 'Error al verificar estado de sandbox',
                }, null, 2),
              },
            ],
          };
        }
      }

      case 'diagnose_integration': {
        const diagnostics: any = {
          timestamp: new Date().toISOString(),
          checks: [],
        };

        // Check 1: Token configurado
        if (!accessToken) {
          diagnostics.checks.push({
            name: 'access_token_configured',
            status: 'error',
            message: 'MERCADOPAGO_ACCESS_TOKEN no está configurado',
          });
        } else {
          diagnostics.checks.push({
            name: 'access_token_configured',
            status: 'ok',
            message: 'Token configurado',
            details: {
              prefix: accessToken.substring(0, 20) + '...',
              length: accessToken.length,
              type: accessToken.startsWith('TEST-')
                ? 'sandbox'
                : accessToken.startsWith('APP_USR-')
                ? 'production'
                : 'unknown',
            },
          });
        }

        // Check 2: Conexión con API
        try {
          const testPreference = await preferenceClient.create({
            body: {
              items: [
                {
                  id: 'diagnostic-test',
                  title: 'Diagnostic Test',
                  quantity: 1,
                  unit_price: 1,
                },
              ],
            },
          });

          diagnostics.checks.push({
            name: 'api_connection',
            status: 'ok',
            message: 'Conexión exitosa con API de Mercado Pago',
            details: {
              preferenceId: testPreference.id,
              hasSandboxUrl: !!testPreference.sandbox_init_point,
              hasProdUrl: !!testPreference.init_point,
            },
          });

          // Check 3: Sandbox disponible
          diagnostics.checks.push({
            name: 'sandbox_available',
            status: testPreference.sandbox_init_point ? 'ok' : 'warning',
            message: testPreference.sandbox_init_point
              ? 'Sandbox disponible y funcionando'
              : 'Sandbox no disponible. El token puede ser de producción.',
            details: {
              sandboxUrl: testPreference.sandbox_init_point,
              recommendedAction: testPreference.sandbox_init_point
                ? 'Usar sandbox_init_point para pagos de prueba'
                : 'Verificar que el token sea de prueba o usar init_point para producción',
            },
          });
        } catch (error: any) {
          diagnostics.checks.push({
            name: 'api_connection',
            status: 'error',
            message: 'Error al conectar con API de Mercado Pago',
            details: {
              error: error.message,
              errorCode: error.status || error.statusCode,
            },
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(diagnostics, null, 2),
            },
          ],
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Herramienta desconocida: ${name}`
        );
    }
  } catch (error: any) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Error ejecutando herramienta ${name}: ${error.message}`
    );
  }
});

// Iniciar servidor
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server de Mercado Pago iniciado');
}

main().catch(console.error);
