# Agentic LARS - Backup

## Información del Backup

**Fecha de creación:** 10 de octubre de 2025
**Repositorio original:** C:\Users\v-luisangelr\Documents\GitHub\Agentic
**Repositorio backup:** C:\Users\v-luisangelr\Documents\GitHub\Agentic-LARS

## Contenido del Backup

Este backup incluye el sistema completo de presentación inteligente con avatar interactivo que contiene:

### Archivos principales:
- `ai_engine.py` - Motor de IA con funcionalidades avanzadas de speech recognition y manejo de presentaciones
- `app.py` - Aplicación Flask principal
- `static/` - Archivos estáticos (CSS, JS)
- `templates/` - Plantillas HTML
- `requirements.txt` - Dependencias del proyecto

### Funcionalidades implementadas:
1. **Avatar Interactivo** - Sistema de avatar con Azure Speech Services
2. **Reconocimiento de Voz** - Speech-to-text con detección avanzada de micrófonos
3. **Sistema de Presentación** - 64 diapositivas con contenido especializado basado en transcript
4. **Navegación Inteligente** - Auto-advance y control de flujo
5. **Manejo de Interrupciones** - Sistema robusto para manejar interrupciones de audio
6. **Integración OpenAI** - Procesamiento de lenguaje natural con GPT

### Características técnicas:
- Flask backend con OpenAI GPT-4
- Frontend JavaScript con Azure Speech SDK
- Sistema de audio con múltiples mecanismos de recuperación
- Detección de micrófonos usando WMI y pywin32
- Mapeo completo de presentación con 64 slides de contenido especializado

### Estado del proyecto:
- ✅ Sistema de avatar completamente funcional
- ✅ Reconocimiento de voz mejorado
- ✅ Mapeo completo de presentación (64 slides)
- ✅ Auto-advance implementado
- ✅ Manejo de script tags
- 🔄 Reinicio de audio después de interrupciones (90% completo)

## Notas importantes:
- Este backup mantiene toda la funcionalidad desarrollada hasta la fecha
- El sistema está configurado para funcionar con presentaciones de TCO Assessment
- Incluye mejoras de microphone detection y error handling
- Contiene múltiples mecanismos de fallback para robustez

## Instrucciones de restauración:
1. Copiar archivos al directorio deseado
2. Crear entorno virtual: `python -m venv venv`
3. Activar entorno: `venv\Scripts\activate`
4. Instalar dependencias: `pip install -r requirements.txt`
5. Configurar variables de entorno según `.env.example`
6. Ejecutar: `python app.py`