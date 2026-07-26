pipeline {
    agent any

    tools {
        jdk 'jdk17'
        nodejs 'node20'
    }

    environment {
        SCANNER_HOME      = tool 'sonar-scanner'
        DOCKER_CREDS      = credentials('docker')
        NVD_API_KEY       = credentials('nvd-api-key')
    }

    stages {

        stage('Clean Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Git Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-creds',
                    url: 'https://github.com/ridamdarji25/pulsecheck-devsecops-pipeline.git'
            }
        }

        stage('Docker Cleanup') {
            steps {
                sh '''
                    docker rm -f backend || true
                    docker rm -f frontend || true
                    docker rmi ${DOCKER_CREDS_USR}/pulsecheck-backend:latest || true
                    docker rmi ${DOCKER_CREDS_USR}/pulsecheck-frontend:latest || true
                    docker image prune -f || true
                '''
            }
        }

        stage('Create Docker Network') {
            steps {
                sh '''
                    docker network inspect pulsecheck-network >/dev/null 2>&1 || \
                    docker network create pulsecheck-network
                '''
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                dir('backend') {
                    sh 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('Install Frontend Dependencies') {
            steps {
                dir('frontend') {
                    sh 'npm install --legacy-peer-deps'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonar-server') {
                    sh """
                        \$SCANNER_HOME/bin/sonar-scanner \
                        -Dsonar.projectName=PulseCheck \
                        -Dsonar.projectKey=PulseCheck \
                        -Dsonar.sources=frontend/src,backend
                    """
                }
            }
        }

        stage('Code Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }

        stage('OWASP Dependency Check') {
            steps {
                dependencyCheck additionalArguments: "--scan ./ --disableYarnAudit --disableNodeAudit --nvdApiKey ${NVD_API_KEY} -n", odcInstallation: 'DP-Check'
                dependencyCheckPublisher pattern: '**/dependency-check-report.xml'
            }
        }

        stage('Trivy File Scan') {
            steps {
                sh 'trivy fs . > trivy-fs-report.txt || true'
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                dir('backend') {
                    sh "docker build -t ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER} ."
                }
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                dir('frontend') {
                    sh "docker build -t ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER} ."
                }
            }
        }

        stage('Trivy Image Scan') {
            steps {
                sh "trivy image ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER} > trivy-backend-image.txt || true"
                sh "trivy image ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER} > trivy-frontend-image.txt || true"
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

        stage('Run Backend Container') {
            steps {
                sh '''
                    docker rm -f backend || true
                    docker run -d --name backend --network pulsecheck-network -p 3001:3001 ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER}
                '''
            }
        }

        stage('Run Frontend Container') {
            steps {
                sh '''
                    docker rm -f frontend || true
                    docker run -d --name frontend --network pulsecheck-network -p 80:80 ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER}
                '''
            }
        }

        stage('Update K8s Manifests (GitOps)') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'github-creds', usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
                    sh """
                        sed -i "s|image: .*pulsecheck-backend:.*|image: ${DOCKER_CREDS_USR}/pulsecheck-backend:${BUILD_NUMBER}|g" k8s/backend-deployment.yaml
                        sed -i "s|image: .*pulsecheck-frontend:.*|image: ${DOCKER_CREDS_USR}/pulsecheck-frontend:${BUILD_NUMBER}|g" k8s/frontend-deployment.yaml
                        git config user.email "jenkins@pulsecheck.local"
                        git config user.name "jenkins-ci"
                        git add k8s/backend-deployment.yaml k8s/frontend-deployment.yaml
                        git commit -m "CI: update image tags to build ${BUILD_NUMBER}" || echo "No changes to commit"
                        git push https://\${GIT_USER}:\${GIT_TOKEN}@github.com/ridamdarji25/pulsecheck-devsecops-pipeline.git main
                    """
                }
            }
        }
    }

    post {
        always {
            sh 'docker image prune -af || true'
            emailext attachLog: true,
                subject: "Build '${currentBuild.result}' - ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "<html><body><p>Project: ${env.JOB_NAME}</p><p>Build: #${env.BUILD_NUMBER}</p><p>URL: ${env.BUILD_URL}</p></body></html>",
                to: 'ridamdarji2729@gmail.com',
                mimeType: 'text/html',
                attachmentsPattern: 'trivy-fs-report.txt,trivy-backend-image.txt,trivy-frontend-image.txt'
        }
    }
}