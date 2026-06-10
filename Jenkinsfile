/**
 * PIPELINE CI/CD — HU-01: Filtrado de historial de revisiones
 * Proyecto: Outline — Wiki colaborativo
 *
 * Etapas:
 *  1. Checkout       — clona el repositorio
 *  2. Install         — instala dependencias con Yarn
 *  3. DB Migrate      — ejecuta migraciones en la BD de prueba
 *  4. Unit Tests      — corre pruebas unitarias (HU-01)
 *  5. Coverage        — genera reporte LCOV
 *  6. SonarQube       — análisis estático + cobertura
 *  7. Quality Gate    — verifica que Sonar apruebe el Quality Gate
 *  8. Docker Build    — construye la imagen de la aplicación
 *  9. Deploy          — despliega el contenedor en el entorno de staging
 */

pipeline {
    agent any

    environment {
        NODE_ENV       = 'test'
        DATABASE_URL   = 'postgres://outlineuser:pass@localhost:5433/outlinetest'
        REDIS_URL      = 'redis://localhost:6379'
        SONAR_TOKEN    = credentials('sonarcloud-token')
        DOCKER_IMAGE   = 'outline-hu01'
        DOCKER_TAG     = "${env.BUILD_NUMBER}"
    }

    tools {
        nodejs 'NodeJS-20'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
                echo "Rama: ${env.BRANCH_NAME} — Build #${env.BUILD_NUMBER}"
            }
        }

        stage('Install dependencies') {
            steps {
                sh 'corepack enable'
                sh 'yarn install --frozen-lockfile'
            }
        }

        stage('DB Migrate') {
            steps {
                sh 'yarn db:migrate'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'TZ=UTC npx vitest run --project server "revisions"'
            }
            post {
                always {
                    junit '**/test-results/*.xml'
                }
            }
        }

        stage('Coverage') {
            steps {
                sh 'TZ=UTC npx vitest run --project server --coverage "revisions"'
            }
            post {
                always {
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report HU-01'
                    ])
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('SonarCloud') {
                    sh '''
                        npx sonarqube-scanner \
                          -Dsonar.token=${SONAR_TOKEN}
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
                sh "docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest"
            }
        }

        stage('Deploy Staging') {
            when {
                branch 'main'
            }
            steps {
                sh "docker stop ${DOCKER_IMAGE} || true"
                sh "docker rm   ${DOCKER_IMAGE} || true"
                sh """
                    docker run -d \
                      --name ${DOCKER_IMAGE} \
                      -p 3000:3000 \
                      -e NODE_ENV=production \
                      ${DOCKER_IMAGE}:${DOCKER_TAG}
                """
                echo "Desplegado en http://localhost:3000"
            }
        }
    }

    post {
        success {
            echo "Pipeline completado exitosamente — Quality Gate: PASSED"
        }
        failure {
            echo "Pipeline fallido — revisar logs de la etapa que falló"
        }
        always {
            cleanWs()
        }
    }
}
