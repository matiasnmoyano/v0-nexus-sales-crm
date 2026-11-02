# Nexus Sales · Prospección con agentes de IA

CRM de prospección construido en solitario durante el hackathon **Zero to Agent** de Vercel (abril 2025). Le das la web de una empresa y un agente la investiga, detecta qué le duele, puntúa el lead y redacta el primer contacto.

**Demo:** https://v0-nexus-sales-crm.vercel.app

## Qué hace el agente

- **Analiza la empresa** a partir de su sitio: nombre, rubro y hasta cinco problemas digitales u operativos, cada uno con su evidencia.
- **Recomienda la solución**: automatización o software a medida, con la justificación.
- **Puntúa el lead** de 0 a 100, desglosado en dolor digital, capacidad de compra y encaje con el servicio.
- **Redacta los mensajes** de contacto inicial.
- Salida estructurada y validada con Zod; respuestas en streaming con el Vercel AI SDK.

## Stack

Next.js · TypeScript · Vercel AI SDK (tools, salida estructurada) · Zod · Neon (Postgres serverless) · next-intl (ES/EN) · Tailwind · shadcn/ui

## Desarrollo

```bash
pnpm install
pnpm dev
```

Autor: [Matías Moyano](https://github.com/matiasnmoyano).
