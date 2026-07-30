# PulseCheck DevSecOps Pipeline

A complete, production-style CI/CD and GitOps pipeline built from scratch on AWS. This repository is not really about the application it deploys. The application, PulseCheck, is intentionally simple: a live service-status dashboard with a React frontend and a Node.js backend. What this project is actually about is everything wrapped around that application: the security scanning, the infrastructure automation, the container orchestration, and the deployment pipeline that takes a single `git push` and turns it into a running, auto-scaled, monitored workload on Kubernetes without a human ever touching `kubectl` in the middle of it.

If you are reading this as a recruiter or a hiring manager, the short version is this: everything below was built, broken, debugged, and fixed by hand. Nothing here is a copy-pasted tutorial repo. Every error you will read about in the commit history (and there were many, from EKS node groups refusing to join the cluster to Docker's legacy builder silently corrupting shim processes) was diagnosed and resolved as part of building this.

<br>

## Architecture Diagram

<img width="1693" height="929" alt="arch" src="https://github.com/user-attachments/assets/0938f46d-92a4-42ee-9477-771952c9ae1e" />

<br>

## Table of Contents

- [Architecture Diagram](#architecture-diagram)
- [What This Project Demonstrates](#what-this-project-demonstrates)
- [Tech Stack](#tech-stack)
- [Architecture Overview](#architecture-overview)
- [Repository Structure](#repository-structure)
- [The Application Layer](#the-application-layer)
- [Containerization](#containerization)
- [Infrastructure as Code](#infrastructure-as-code)
- [Continuous Integration (Jenkins)](#continuous-integration-jenkins)
- [Security Scanning](#security-scanning)
- [Kubernetes Deployment](#kubernetes-deployment)
- [GitOps and Continuous Delivery (ArgoCD)](#gitops-and-continuous-delivery-argocd)
- [Monitoring](#monitoring)
- [The Full Workflow, End to End](#the-full-workflow-end-to-end)
- [Setup Instructions](#setup-instructions)
- [Cost Considerations](#cost-considerations)
- [Lessons Learned and Problems Solved](#lessons-learned-and-problems-solved)
- [Future Improvements](#future-improvements)

<br>

## What This Project Demonstrates

Most portfolio DevOps projects stop at "I containerized an app and deployed it to Kubernetes." This one goes several steps further and tries to mirror what an actual DevSecOps pipeline looks like inside a company that takes its software supply chain seriously.

Specifically, this project demonstrates:

- Writing and provisioning cloud infrastructure entirely through code, using Terraform, rather than clicking through the AWS console
- Building a CI pipeline where every stage has a purpose: code quality, dependency vulnerability scanning, container image scanning, and image publishing
- Separating the concerns of build and deploy properly, so that the CI server never has direct access to the production cluster
- Using GitOps as the actual deployment mechanism, where the desired state of the cluster lives in Git and a controller reconciles it, rather than a script running `kubectl apply` blindly
- Configuring autoscaling, health probes, and resource limits the way a real workload would need them
- Documenting the debugging process honestly, because knowing how to fix a broken pipeline is a more valuable skill than never breaking one

<br>

## Tech Stack

<p align="left">
  <img src="https://skillicons.dev/icons?i=aws,terraform,docker,kubernetes,jenkins,git,github,linux,bash,nodejs,react,vite" />
</p>

| Layer | Tool |
|---|---|
| Source control | GitHub |
| CI | Jenkins (Pipeline as Code, Jenkinsfile) |
| Code quality | SonarQube |
| Dependency scanning | OWASP Dependency-Check |
| Container image scanning | Trivy |
| Container runtime | Docker (multi-stage builds) |
| Infrastructure as Code | Terraform (AWS provider, terraform-aws-modules) |
| Cloud provider | AWS (VPC, EKS, EC2, IAM, S3, DynamoDB-free native S3 locking) |
| Orchestration | Kubernetes (Amazon EKS) |
| Ingress | ingress-nginx |
| GitOps / CD | ArgoCD |
| Monitoring | Prometheus and Grafana (Helm-installed, in-cluster) |
| Registry | DockerHub |

<br>

## Architecture Overview

The high-level flow, from a developer's keystroke to a running pod on Kubernetes, looks like this:

```
Developer pushes code to GitHub
        |
        v
GitHub webhook fires
        |
        v
Jenkins pulls the latest code and runs the pipeline:
   - SonarQube static analysis and quality gate
   - OWASP Dependency-Check against the NVD database
   - Docker build (frontend and backend images, multi-stage)
   - Trivy filesystem scan
   - Trivy image scan
   - Push both images to DockerHub, tagged with the build number
        |
        v
Jenkins updates the Kubernetes manifests in this repository
with the new image tag and pushes that change back to GitHub
(this is the GitOps handoff point; Jenkins never touches the cluster directly)
        |
        v
ArgoCD, running inside the EKS cluster, is continuously watching
the k8s/ folder in this repository. It detects the change and
syncs automatically
        |
        v
Kubernetes performs a rolling update across the backend and
frontend Deployments
        |
        v
Ingress-nginx routes external traffic to the correct Service
        |
        v
Prometheus scrapes metrics from the running pods, Grafana
visualizes them
```

The deliberate design choice here is that Jenkins and ArgoCD each own exactly one half of the problem. Jenkins is responsible for turning source code into a trustworthy, scanned container image. ArgoCD is responsible for making sure the cluster's actual state matches what is declared in Git. Neither tool needs to know how the other one works, and Jenkins in particular never holds cluster credentials, which is a meaningfully better security posture than the common pattern of a CI server running `kubectl apply` with a service account key sitting in its environment variables.

<br>

## Repository Structure

```
pulsecheck-devsecops-pipeline/
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── routes/
│   └── package.json
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── 40-set-resolver.sh
│   ├── src/
│   └── package.json
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   ├── ingress.yaml
│   └── hpa.yaml
├── terraform/
│   ├── backend.tf
│   ├── vpc.tf
│   ├── eks.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars
├── argocd/
│   └── application.yaml
├── monitoring/
│   ├── prometheus-values.yaml
│   └── servicemonitor.yaml
├── Jenkinsfile
├── docker-compose.yml
└── README.md
```

<br>

## The Application Layer

PulseCheck is a two-tier application, deliberately kept simple so that the pipeline around it stays the focus of the project.

The **backend** is a small Node.js and Express API. Its core job is to accept a list of services (either predefined or added by a user through the UI) and actively check whether each one is reachable, recording the response latency. It exposes a `/health` endpoint that Kubernetes uses for liveness and readiness probing, and an `/api/status` endpoint that returns the live status of every monitored service as JSON.

The **frontend** is a React application built with Vite and styled with Tailwind CSS, with Framer Motion handling the small animations (the pulsing status indicators, the card entrance transitions). It polls the backend every fifteen seconds and renders each monitored service as a card showing whether it is up, slow, or down.

In production, the frontend is served as static files through Nginx rather than a Node development server, which is both faster and considerably lighter on resources.

<br>

## Containerization

Both services are built using multi-stage Dockerfiles, which matters more than it sounds like it should.

For the backend, dependencies are installed in a build stage using `npm ci --omit=dev`, and only the production `node_modules` and application code are carried into the final image. This keeps unnecessary build tooling out of what actually runs.

For the frontend, the first stage compiles the Vite project into static assets. The second stage starts from a clean `nginx:alpine` image and copies in only the compiled output, none of the source code, none of the node_modules used to build it. The final frontend image is a fraction of the size it would be if it shipped the entire build toolchain.

One detail worth calling out: the Nginx configuration for the frontend uses a small entrypoint script (`40-set-resolver.sh`) that detects at container startup whether it is running inside Docker Compose or inside Kubernetes, and configures the correct DNS resolver and backend hostname accordingly. This was necessary because the backend hostname that resolves correctly in a local Docker network is not the same one that resolves inside a Kubernetes cluster's DNS, and hardcoding either one would have broken the other environment.

A `docker-compose.yml` file is included purely for local development, so that both services and the network between them can be spun up and tested with a single command before anything touches the cloud.

<br>

## Infrastructure as Code

All AWS infrastructure is provisioned through Terraform, using the well-established `terraform-aws-modules` community modules for both the VPC and EKS rather than writing every resource by hand.

The VPC is built with both public and private subnets across two availability zones, with a single NAT gateway rather than one per zone. This is a deliberate cost tradeoff: a NAT gateway per availability zone is the highly-available production pattern, but for a project like this it roughly doubles a recurring cost for a benefit that does not apply outside of a real production incident.

The EKS module provisions the control plane, a managed node group, and explicitly installs the core cluster add-ons (`vpc-cni`, `kube-proxy`, `coredns`) with the CNI add-on set to install before the compute layer comes up. That last detail turned out to matter a great deal in practice, and is covered further down in the lessons-learned section.

Terraform state is stored remotely in an S3 bucket, with state locking handled natively through S3's own locking support rather than a separate DynamoDB table, since Terraform added that capability directly.

<br>

## Continuous Integration (Jenkins)

Jenkins runs on a dedicated EC2 instance and drives the entire build side of the pipeline through a single Jenkinsfile, written as a declarative pipeline rather than a loose collection of shell scripts.

The pipeline stages, in order, are:

1. **Clean workspace and checkout** the latest commit from GitHub
2. **Docker cleanup**, removing any previous application containers and images by name (this never touches SonarQube's own container, which runs persistently and independently)
3. **Dependency installation** for both the frontend and backend
4. **SonarQube static analysis**, followed by a quality gate check
5. **OWASP Dependency-Check**, scanning all project dependencies against the National Vulnerability Database
6. **Trivy filesystem scan**, checking the raw source tree for known vulnerabilities before anything is even built into an image
7. **Docker image builds** for both services, with the frontend's API base URL passed in as a build argument
8. **Trivy image scans** against both finished images
9. **Push to DockerHub**, tagged both with the Jenkins build number and with `latest`
10. **Local container smoke test**, running both freshly built images side by side on the Jenkins host itself, on a dedicated Docker network, before anything is trusted enough to go further
11. **The GitOps handoff**: updating the image tags inside the Kubernetes manifests in this same repository and pushing that change back to GitHub

Every scanning stage in this pipeline is intentionally non-blocking; findings are reported and attached to the build's email notification rather than failing the pipeline outright. In a real production environment those thresholds would be tightened considerably, and part of what makes this pipeline "portfolio-honest" is being upfront about that tradeoff rather than pretending otherwise.

<br>

## Security Scanning

Three distinct scanning tools are used, each catching a different class of problem:

- **SonarQube** looks at the code itself: complexity, duplication, code smells, and static analysis rules that catch bugs before they ship
- **OWASP Dependency-Check** looks at every third-party package the application depends on, cross-referencing them against publicly disclosed CVEs
- **Trivy** looks at the built container images and the filesystem, catching vulnerable OS packages and libraries that might have been pulled in through a base image rather than through application code directly

Running all three is what makes this a DevSecOps pipeline rather than just a DevOps one. Security is not a separate audit that happens later; it is a stage that runs on every single commit.

<br>

## Kubernetes Deployment

The application runs on Amazon EKS across two Deployments (frontend and backend), each with its own Service, resource requests and limits, and liveness and readiness probes pointed at real health endpoints rather than just checking that a process is alive.

An Ingress resource, backed by the `ingress-nginx` controller, routes traffic: anything under `/api` is forwarded to the backend service with the prefix preserved, and everything else is served by the frontend. Two HorizontalPodAutoscalers, one per service, scale each Deployment between two and five replicas based on CPU utilization, which requires the `metrics-server` add-on to be running in the cluster.

`ingress-nginx` was chosen over the AWS Load Balancer Controller specifically because it avoids the additional IAM OIDC provider and service-account wiring that the ALB controller requires, which is extra setup complexity that does not add much value at this project's scale.

<br>

## GitOps and Continuous Delivery (ArgoCD)

ArgoCD runs inside the cluster and is pointed, through an `Application` manifest, at the `k8s/` directory of this repository. It continuously compares what is declared in Git against what is actually running in the cluster, and automatically syncs any drift.

This is the part of the pipeline that turns Jenkins's final commit (the image tag update) into an actual rolling deployment. Jenkins does not run `kubectl apply` anywhere in this pipeline. It only ever touches Git. ArgoCD is the only thing with permission to change the cluster's state, which is a meaningfully smaller attack surface than giving a CI server direct cluster credentials.

<br>

## Monitoring

Prometheus and Grafana are installed inside the cluster using the community Helm chart, rather than on a separate standalone monitoring server. A ServiceMonitor resource tells Prometheus how to scrape metrics from the running pods, and Grafana is configured with Prometheus as its data source for visualizing them.

Metrics worth watching for a workload like this include request latency and error rate on the backend, pod CPU and memory usage against the configured requests and limits, and HPA scaling events, since those directly show the autoscaling behavior actually working rather than just being configured.

<br>

## The Full Workflow, End to End

To make the whole thing concrete, here is exactly what happens from a single `git push`:

A developer commits a change and pushes to the `main` branch. GitHub's webhook fires immediately and hits Jenkins. Jenkins checks out the new code, runs SonarQube analysis and waits on the quality gate, runs OWASP Dependency-Check against the current dependency tree, and runs a Trivy filesystem scan. It then builds fresh Docker images for whichever services changed, scans those images with Trivy, and pushes them to DockerHub tagged with the new Jenkins build number.

As a final step, Jenkins edits the `image:` line inside `k8s/backend-deployment.yaml` and `k8s/frontend-deployment.yaml` to point at the new tag, commits that change under its own Git identity, and pushes it back to the same repository.

At this point Jenkins's job is completely finished. It never contacts the Kubernetes cluster.

ArgoCD, which has been polling this repository the entire time, notices that the manifests in `k8s/` no longer match what is deployed. It automatically syncs, and Kubernetes performs a rolling update, replacing old pods with new ones gradually so that the service never actually goes down mid-deploy. Ingress-nginx keeps routing traffic to whichever pods are currently healthy throughout that transition, and Prometheus keeps scraping metrics the entire time, so any regression in latency or error rate during the rollout would show up in Grafana immediately.

<br>

## Setup Instructions

These instructions assume an existing AWS account and a Jenkins server already provisioned (an EC2 instance is what this project actually used).

**1. Bootstrap the Terraform backend**

Create an S3 bucket for state storage before running Terraform for the first time; Terraform cannot create the backend it is about to use.

**2. Provision the infrastructure**

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This provisions the VPC, the EKS cluster, and a managed node group. Expect this to take roughly fifteen to twenty minutes.

**3. Configure kubectl**

```bash
aws eks update-kubeconfig --region <your-region> --name <your-cluster-name>
kubectl get nodes
```

**4. Install the metrics server and ingress controller**

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install nginx-ingress ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.service.type=LoadBalancer
```

**5. Deploy the application manifests**

```bash
kubectl apply -f k8s/
```

**6. Install ArgoCD**

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -f argocd/application.yaml
```

**7. Install Prometheus and Grafana**

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  -f monitoring/prometheus-values.yaml
```

**8. Configure Jenkins**

Jenkins needs the following configured before the pipeline will run cleanly: JDK 17, NodeJS, the SonarQube Scanner tool, and OWASP Dependency-Check, all set up under Global Tool Configuration; credentials for DockerHub, GitHub (a personal access token), and an NVD API key for OWASP Dependency-Check; and a SonarQube server connection with its own generated token. A GitHub webhook pointed at Jenkins's `/github-webhook/` endpoint triggers the pipeline automatically on every push.

**Required IAM permissions for Jenkins**

At minimum, the IAM identity Jenkins uses to run Terraform and interact with AWS needs permissions covering EC2, VPC, EKS, IAM role and policy management (since the EKS module creates its own node roles), and S3 access for the Terraform state bucket. For a portfolio project, attaching broad managed policies is a reasonable shortcut; in a production setting, this would be scoped down to a minimal custom policy covering only the specific actions Terraform actually calls.

<br>

## Cost Considerations

Running this stack is not free, and being upfront about that is part of treating this like a real piece of infrastructure rather than a toy.

The EKS control plane is billed hourly regardless of usage. Worker nodes are billed as ordinary EC2 instances. The NAT gateway has both an hourly cost and a per-gigabyte data processing cost. Any LoadBalancer-type Kubernetes Service, including the one ingress-nginx creates, provisions a real AWS load balancer that bills continuously while it exists.

For anyone replicating this project, the practical advice is: run `terraform destroy` the moment you are done testing, keep to a single NAT gateway rather than one per availability zone, and set a billing alert before you start. None of this infrastructure needs to run continuously to prove that the pipeline works; it needs to run long enough to demonstrate it, get screenshots or a recording, and then come back down.

<br>

## Lessons Learned and Problems Solved

This section exists because the debugging process was, honestly, a bigger learning experience than writing the original configuration.

**EKS nodes stuck in NotReady with a CNI initialization error.** The Terraform EKS module, when given both a node group and an `addons` block, does not guarantee that the VPC CNI add-on installs before the node group's instances try to join the cluster. Nodes would launch, register, and then sit indefinitely reporting `NetworkPluginNotReady: cni plugin not initialized`, because there was no CNI DaemonSet yet for them to attach to. The fix was setting `before_compute = true` on the `vpc-cni` add-on definition, forcing Terraform to install the CNI before the compute layer is created at all, which resolves the chicken-and-egg dependency cleanly.

**Docker's legacy builder silently corrupting container state.** Partway through this project, Docker builds and even unrelated running containers (including a SonarQube instance that had been up for hours) started failing with a range of different low-level errors: `cannot start a stopped process`, `broken pipe`, `procReady not received`, and eventually a networking-namespace bind-mount failure. These all trace back to the same root cause, an unstable containerd and legacy-builder state on the host, most likely triggered by a daemon restart while builds were in flight. Enabling BuildKit helped, but the fully reliable fix was a clean reboot of the host, which reset containerd's internal state entirely.

**Losing the same public IP on every reboot.** Rebooting the Jenkins EC2 instance to fix the above issue meant losing its public IP each time, which broke the GitHub webhook, the SonarQube webhook, and the SonarQube server URL configured inside Jenkins. Allocating and associating an Elastic IP made the instance's address permanent across reboots and stops, at a negligible cost as long as the instance stays attached to it.

**Nginx resolving a Docker Compose hostname that does not exist in Kubernetes.** The frontend's Nginx configuration needed to reach the backend by hostname, but the correct hostname differs entirely between a local Docker network (where Docker's embedded DNS resolves a container name directly) and Kubernetes (where CoreDNS expects a fully qualified service name). The fix was a small entrypoint script that detects which environment it is running in by checking for the `KUBERNETES_SERVICE_HOST` variable that Kubernetes always sets, and patches the Nginx config with the correct backend hostname and DNS resolver at container startup.

**A local `kind` cluster with completely broken DNS after weeks of uptime.** During local testing, an aging local Kubernetes cluster reached a state where no pod, including a completely fresh test pod with no custom configuration, could resolve any DNS name at all, timing out even against CoreDNS's own ClusterIP. CoreDNS itself was healthy and its endpoints were correctly registered, which pointed to the cluster's underlying networking rather than DNS specifically. Recreating the local cluster from scratch resolved it in under a minute, which was considerably faster than continuing to debug an environment that was never meant to be long-lived in the first place.

<br>

## Future Improvements

- Move IAM permissions from broad managed policies to a tightly scoped custom policy
- Add automated test suites for both the frontend and backend, and make the quality gates and vulnerability thresholds properly blocking once test coverage exists to support that
- Introduce a staging namespace or separate cluster so ArgoCD can promote through environments rather than syncing straight to a single one
- Add TLS through cert-manager and a real domain, rather than accessing everything over plain HTTP through a LoadBalancer hostname
- Replace the single NAT gateway with one per availability zone for genuine high availability, once cost is less of a constraint
- Extract the pipeline logic into a Jenkins Shared Library once there is more than one service or repository reusing the same CI stages; for a single-project pipeline like this one, a shared library would have added an extra layer of indirection without a real payoff

<br>

---
