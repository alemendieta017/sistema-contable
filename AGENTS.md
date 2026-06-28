<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/002-accounting-dashboard/plan.md
<!-- SPECKIT END -->

# Reglas de Desarrollo / Development Rules
- **WSL Exclusivo / WSL Only**: Todo el desarrollo de este proyecto (creación de archivos, modificaciones de código y ejecución de comandos de Docker/npm) debe realizarse exclusivamente dentro del entorno de WSL (Linux) en `/root/dev/sistema-contable/` (ruta de Windows: `\\wsl.localhost\Ubuntu-24.04\root\dev\sistema-contable`). No se debe generar código ni ejecutar comandos de desarrollo en la ruta local del host de Windows (OneDrive/Documentos), la cual se reserva únicamente para archivos de ofimática.
