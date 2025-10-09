# Agentic - Asistente Virtual con Voz

Agentic es un asistente virtual que combina texto y voz para una interacción natural. Utiliza Azure Cognitive Services para el procesamiento de voz y OpenAI para la generación de respuestas inteligentes.

## Características

- 🎙️ Modo voz con reconocimiento de voz en tiempo real
- ⌨️ Modo texto para entrada tradicional
- 🔄 Cambio fácil entre modos voz y texto
- 🗣️ Síntesis de voz para todas las respuestas
- ⏸️ Capacidad de interrumpir la respuesta hablada
- 🎯 Interfaz de usuario intuitiva

## Requisitos Previos

- Python 3.8 o superior
- Una cuenta de Azure con los siguientes servicios:
  - Azure Cognitive Services (Speech Services)
  - Azure OpenAI Service
- Las claves y endpoints correspondientes de los servicios de Azure

## Configuración

1. **Clonar el Repositorio**
   ```powershell
   git clone https://github.com/ChrisbFrias/Agentic.git
   cd Agentic
   ```

2. **Crear y Activar el Entorno Virtual**
   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. **Instalar Dependencias**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configurar Variables de Entorno**
   
   Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:
   ```env
   AZURE_SPEECH_KEY=tu_clave_de_speech_services
   AZURE_SPEECH_REGION=tu_region_de_speech_services
   AZURE_OPENAI_KEY=tu_clave_de_openai
   AZURE_OPENAI_ENDPOINT=tu_endpoint_de_openai
   ```

   O configúralas en las variables de entorno del sistema.

## Uso

1. **Iniciar la Aplicación**
   ```powershell
   python app.py
   ```

2. **Acceder a la Interfaz**
   - Abre un navegador web
   - Visita `http://localhost:5000`

3. **Modos de Uso**
   - **Modo Voz**: 
     - Haz clic en el botón de micrófono
     - Habla cuando veas "Escuchando..."
     - La IA responderá con voz y texto
   - **Modo Texto**:
     - Escribe tu mensaje en el campo de texto
     - Presiona Enter o el botón de enviar
     - La IA responderá con voz y texto
   - **Interrumpir la Respuesta**:
     - Puedes hablar o escribir en cualquier momento para interrumpir la respuesta actual

## Estructura del Proyecto

```
Agentic/
│
├── ai_engine.py         # Lógica de IA y procesamiento de voz
├── app.py              # Servidor Flask y endpoints
├── requirements.txt    # Dependencias del proyecto
│
├── static/
│   ├── css/
│   │   └── style.css   # Estilos de la interfaz
│   └── js/
│       └── script.js   # Lógica del cliente
│
└── templates/
    └── index.html      # Página principal
```

## Solución de Problemas

1. **No se escucha el audio**
   - Verifica que tu navegador tenga permiso para reproducir audio
   - Asegúrate de que no esté silenciado

2. **El micrófono no funciona**
   - Verifica los permisos del navegador para el micrófono
   - Asegúrate de que el micrófono esté seleccionado como dispositivo de entrada

3. **Errores de API**
   - Verifica que las variables de entorno estén correctamente configuradas
   - Asegúrate de que las claves de API sean válidas

## Tecnologías Utilizadas

- Flask (Backend)
- Azure Cognitive Services Speech SDK
- Azure OpenAI Service
- HTML5, CSS3, JavaScript (Frontend)
- Web Speech API (Reconocimiento de voz del navegador)

## Nota de Seguridad

No compartas tus claves de API. Asegúrate de que el archivo `.env` esté incluido en `.gitignore` antes de hacer commits.