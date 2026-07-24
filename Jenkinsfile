pipeline {
    agent any

    tools {
        jdk 'jdk17'
        nodejs 'node20'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 60, unit: 'MINUTES')
    }

    environment {
        SCANNER_HOME      = tool 'sonar-scanner'
        DOCKER_CREDS      = credentials('docker')
        GITHUB_CREDS      = credentials('github-creds')
        NVD_API_KEY       = credentials('nvd-api-key')
        VITE_API_BASE_URL = 'http://localhost:3001'
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Git Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('pulsecheck-app/backend') {
                    sh 'npm ci --legacy-peer-deps'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('pulsecheck-app/frontend') {
                    sh 'npm ci --legacy-peer-deps'
                }
            }
        }

        stage('Backend Unit Tests') {
            steps {
                dir('pulsecheck-app/backend') {
                    sh 'npm test'
                }
            }
        }

        stage('Frontend Unit Tests') {
            steps {
                dir('pulsecheck-app/frontend') {
                    sh 'npm test'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh '''
                        $SCANNER_HOME/bin/sonar-scanner \
                        -Dsonar.projectName=pulsecheck \
                        -Dsonar.projectKey=pulsecheck \
                        -Dsonar.sources=pulsecheck-app/frontend/src,pulsecheck-app/backend
                    '''
                }
            }
        }

        stage('Code Quality Gate') {
            steps {
                script {
                    waitForQualityGate abortPipeline: true, credentialsId: 'Sonar-token'
                }
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck additionalArguments: "--scan ./ --disableYarnAudit --nvdApiKey ${NVD_API_KEY} -n", odcInstallation: 'DP-Check'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml',
                    failedTotalCritical: 1,
                    failedTotalHigh: 1
            }
        }

        stage('Trivy File Scan') {
            steps {
                sh 'trivy fs --severity MEDIUM,HIGH,CRITICAL --no-progress . > trivy-fs-report.txt'
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                dir('pulsecheck-app/backend') {
                    sh "docker build --pull -t ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER} ."
                }
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                dir('pulsecheck-app/frontend') {
                    sh """
                        docker build --pull \
                        --build-arg VITE_API_BASE_URL=${VITE_API_BASE_URL} \
                        -t ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER} .
                    """
                }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh "trivy image --severity HIGH,CRITICAL --exit-code 1 --no-progress ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER} > trivy-backend-image.txt"
                sh "trivy image --severity HIGH,CRITICAL --exit-code 1 --no-progress ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER} > trivy-frontend-image.txt"
            }
        }

        stage('Push Images to DockerHub') {
            steps {
                script {
                    withDockerRegistry(credentialsId: 'docker', url: 'https://index.docker.io/v1/') {
                        sh "docker push ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER}"
                        sh "docker push ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER}"

                        sh "docker tag ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER} ${DOCKER_CREDS_USR}/pulsecheck-backend:latest"
                        sh "docker tag ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER} ${DOCKER_CREDS_USR}/pulsecheck-frontend:latest"
                        sh "docker push ${DOCKER_CREDS_USR}/pulsecheck-backend:latest"
                        sh "docker push ${DOCKER_CREDS_USR}/pulsecheck-frontend:latest"
                    }
                }
            }
        }

        stage('Update K8s Manifests (GitOps)') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh '''
                        sed -i "s|image: .*pulsecheck-backend:.*|image: ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER}|g" pulsecheck-app/k8s/backend-deployment.yaml
                        sed -i "s|image: .*pulsecheck-frontend:.*|image: ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER}|g" pulsecheck-app/k8s/frontend-deployment.yaml

                        git config user.email "jenkins@pulsecheck.local"
                        git config user.name "jenkins-ci"

                        git add pulsecheck-app/k8s/backend-deployment.yaml pulsecheck-app/k8s/frontend-deployment.yaml
                        git commit -m "CI: update image tags to build ${BUILD_NUMBER}" || echo "No changes to commit"

                        git push https://${GIT_USER}:${GIT_TOKEN}@github.com/${GIT_USER}/pulsecheck-devsecops-pipeline.git main
                    '''
                }
            }
        }
    }

    post {
        always {
            sh """
                docker rmi ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER} || true
                docker rmi ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER} || true
                docker image prune -f
            """
        }

        success {
            emailext attachLog: true,
                subject: "BUILD SUCCESS - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <html><body>
                        <div style="background-color:#28a745;padding:12px;border-radius:4px;margin-bottom:10px;">
                            <p style="color:white;font-weight:bold;font-size:16px;margin:0;">Build Succeeded</p>
                        </div>
                        <div style="padding:10px;">
                            <p><b>Project:</b> ${env.JOB_NAME}</p>
                            <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                            <p><b>URL:</b> <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                        </div>
                    </body></html>
                """,
                to: 'your-email@example.com',
                mimeType: 'text/html',
                attachmentsPattern: 'trivy-fs-report.txt,trivy-backend-image.txt,trivy-frontend-image.txt'
        }

        failure {
            emailext attachLog: true,
                subject: "BUILD FAILED - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <html><body>
                        <div style="background-color:#dc3545;padding:12px;border-radius:4px;margin-bottom:10px;">
                            <p style="color:white;font-weight:bold;font-size:16px;margin:0;">Build Failed</p>
                        </div>
                        <div style="padding:10px;">
                            <p><b>Project:</b> ${env.JOB_NAME}</p>
                            <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                            <p><b>URL:</b> <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                            <p>Check the attached log for details.</p>
                        </div>
                    </body></html>
                """,
                to: 'your-email@example.com',
                mimeType: 'text/html'
        }

        unstable {
            emailext attachLog: true,
                subject: "BUILD UNSTABLE - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: """
                    <html><body>
                        <div style="background-color:#fd7e14;padding:12px;border-radius:4px;margin-bottom:10px;">
                            <p style="color:white;font-weight:bold;font-size:16px;margin:0;">Build Unstable - review OWASP report</p>
                        </div>
                        <div style="padding:10px;">
                            <p><b>Project:</b> ${env.JOB_NAME}</p>
                            <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                            <p><b>URL:</b> <a href="${env.BUILD_URL}">${env.BUILD_URL}</a></p>
                        </div>
                    </body></html>
                """,
                to: 'your-email@example.com',
                mimeType: 'text/html',
                attachmentsPattern: '**/dependency-check-report.xml'
        }
    }
}