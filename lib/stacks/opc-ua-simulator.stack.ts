/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import * as path from "path";
import * as _ from "lodash";
import {
    Stack,
    StackProps,
    CfnOutput,
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_iotsitewise as sitewise,
    aws_s3_assets as s3_assets,
    aws_s3_deployment as s3_deployment
} from "aws-cdk-lib";
import { Construct } from "constructs";

import { IotRoleAlias } from "../constructs/iot-role-alias/iot-role-alias";
import { IotThingCertPolicy } from "../constructs/iot-thing-cert-policy/iot-thing-cert-policy";
import { IotThingGroup } from "../constructs/iot-thing-group/iot-thing-group";
import { GreengrassV2Deployment } from "../constructs/greengrass-v2-deployment/greengrass-v2-deployment";
import { SitewiseAssets } from "../constructs/sitewise-assets/sitewise-assets";
import * as stackConstants from "./constants"

export class OpcuaSimulatorStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const stack = Stack.of(this);

        /**
         * Greengrass V2 resources
         */

        // Create IoT role policy for use by Greengrass IoT role alias
        const greengrass_role_minimal_policy = new iam.PolicyDocument({
            statements: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "ecr:GetDownloadUrlForLayer",
                        "ecr:BatchGetImage",
                        "ecr:GetAuthorizationToken",
                        "iot:DescribeCertificate",
                        "logs:CreateLogGroup",
                        "logs:CreateLogStream",
                        "logs:PutLogEvents",
                        "logs:DescribeLogStreams",
                        "iot:Connect",
                        "iot:Publish",
                        "iot:Subscribe",
                        "iot:Receive",
                        "iot:DescribeEndpoint",
                        "iotsitewise:BatchPutAssetPropertyValue",
                        "iotsitewise:List*",
                        "iotsitewise:Describe*",
                        "iotsitewise:Get*",
                        "s3:GetBucketLocation"
                    ],
                    resources: ["*"]
                })
            ]
        });

        // Then create IoT role alias
        const greengrass_role_alias = new IotRoleAlias(this, "GreengrassRoleAlias", {
            iotRoleAliasName: `${stack.stackName}GreengrassRoleAlias`,
            iamRoleName: `${stack.stackName}GreengrassRole`,
            iamPolicy: greengrass_role_minimal_policy
        });

        // Then create IoT thing, certificate/private key, and IoT Policy
        const iot_thing_cert_policy = new IotThingCertPolicy(this, "GreengrassCore", {
            thingName: `${stack.stackName}GreengrassCore`,
            iotPolicyName: `${stack.stackName}-Greengrass-Minimal-Policy`,
            iotPolicy: stackConstants.greengrassCoreMinimalIoTPolicy,
            policyParameterMapping: {
            region: stack.region,
            account: stack.account,
            rolealiasname: greengrass_role_alias.roleAliasName
            }
        });

        // Then create thing group and add thing
        const deployment_group = new IotThingGroup(this, "GreengrassDeploymentGroup", {
            thingGroupName: `${stack.stackName}-Greengrass-Group`
        });
        deployment_group.addThing(iot_thing_cert_policy.thingArn);
        
        // Create sitewise assets
        const sitewise_assets = new SitewiseAssets(this, "SitewiseAssets");

        /**
         * OPC-UA Server creation and Greengrass V2 installation
         */

        const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
            isDefault: true,
        });

        const node_red_settings = new s3_assets.Asset(this, "NodeRedSettings", {
            path: path.join(__dirname, "..", "..", "assets/node-red/settings.js"),
        });

        const node_red_flows = new s3_assets.Asset(this, "NodeRedFlows", {
            path: path.join(__dirname, "..", "..", "assets/node-red/flows.json"),
        });

        const nginx_configuration = new s3_assets.Asset(
            this,
            "NginxConfiguration",
            {
                path: path.join(__dirname, "..", "..", "assets/nginx/default.conf"),
            }
        );

        const scriptTemplate = _.template(stackConstants.greengrassInstallationScript, {
            interpolate: /<%=([\s\S]+?)%>/g
        });
        const script = scriptTemplate({
            region: stack.region,
            thingname: iot_thing_cert_policy.thingName,
            thinggroupname: deployment_group.thingGroupName,
            rolealiasname: greengrass_role_alias.roleAliasName,
            iotdataendpoint: iot_thing_cert_policy.dataAtsEndpointAddress,
            iotcredendpoint: iot_thing_cert_policy.credentialProviderEndpointAddress,
            parameterprivatekey: iot_thing_cert_policy.privateKeySecretParameter,
            parametercertificatepem: iot_thing_cert_policy.certificatePemParameter
        });

        const greengrass_installer_script = new s3_deployment.BucketDeployment(this, "GreengrassInstallerScript", {
            sources: [s3_deployment.Source.data("greengrass-installer.sh", script)],
            destinationBucket: nginx_configuration.bucket,
            prune: false
        });

        const security_group = new ec2.SecurityGroup(this, "SecurityGroup", {
            vpc,
            securityGroupName: `${stack.stackName}-Security-Group`,
            description:
                "Security group for EC2 instances created with OpcuaSimulatorStack",
            allowAllOutbound: true,
        });

        security_group.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(80),
            "Allow HTTP access from the world"
        );

        security_group.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            "Allow AWS IoT SiteWise data endpoint communication"
        );

        security_group.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8443),
            "Allow AWS IoT Greengrass endpoints communication"
        );

        security_group.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(8883),
            "Allow AWS IoT Greengrass endpoints communication"
        );

        security_group.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(54845),
            "Allow OPC-UA access from the world"
        );

        const instance_type = ec2.InstanceType.of(
            ec2.InstanceClass.T3,
            ec2.InstanceSize.SMALL
        );

        const instance_role = new iam.Role(this, "Ec2InstanceRole", {
            roleName: `${stack.stackName}-Instance-Role`,
            assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
        });

        instance_role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"));

        node_red_settings.grantRead(instance_role);
        node_red_flows.grantRead(instance_role);
        nginx_configuration.grantRead(instance_role);
        greengrass_installer_script.deployedBucket.grantRead(instance_role);

        const user_data = ec2.UserData.forLinux({
            shebang: "#!/bin/bash -xe",
        });
        user_data.addCommands(
            "apt-get update -y",
            "apt-get install -y git awscli ec2-instance-connect build-essential nginx",
            "cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup",
            `aws s3 cp ${nginx_configuration.s3ObjectUrl} /etc/nginx/sites-available/default`,
            'until git clone https://github.com/aws-quickstart/quickstart-linux-utilities.git; do echo "Retrying"; done',
            "cd /quickstart-linux-utilities",
            "source quickstart-cfn-tools.source",
            "qs_update-os || qs_err",
            "qs_bootstrap_pip || qs_err",
            "qs_aws-cfn-bootstrap || qs_err",
            "mkdir -p /opt/aws/bin",
            "ln -s /usr/local/bin/cfn-* /opt/aws/bin/"
        );

        const ubuntu_machine_image = ec2.MachineImage.fromSsmParameter(
            "/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id",
            {
                cachedInContext: false,
                os: ec2.OperatingSystemType.LINUX,
                userData: user_data,
            }
        );

        const opcua_server = new ec2.Instance(this, "OpcuaServer", {
            instanceType: instance_type,
            machineImage: ubuntu_machine_image,
            vpc: vpc,
            securityGroup: security_group,
            instanceName: `${stack.stackName}-OPC UA Server`,
            role: instance_role,
            init: ec2.CloudFormationInit.fromElements(
                ec2.InitCommand.shellCommand("curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -"),
                ec2.InitCommand.shellCommand("apt install -y nodejs default-jdk jq"),

                // Install Greengrass and dependent requirements
                ec2.InitFile.fromS3Object('/tmp/greengrass-installer.sh', greengrass_installer_script.deployedBucket, "greengrass-installer.sh"),
                ec2.InitCommand.shellCommand("chmod +x /tmp/greengrass-installer.sh"),
                ec2.InitCommand.shellCommand("sudo -E bash /tmp/greengrass-installer.sh -y -v"),
                
                // Install Node-RED and dependent requirements
                ec2.InitCommand.shellCommand("npm install -g pm2 opcua-commander"),
                ec2.InitCommand.shellCommand("pm2 startup -u ubuntu --hp /home/ubuntu"),
                ec2.InitCommand.shellCommand("npm install -g --unsafe-perm node-red"),
                ec2.InitCommand.shellCommand("su ubuntu -c 'pm2 start node-red -- --userDir /home/ubuntu/.node-red'"),
                ec2.InitCommand.shellCommand(`while [ ! -f /home/ubuntu/.node-red/settings.js ]; do sleep 2; done; sleep 1;`),
                ec2.InitCommand.shellCommand("su ubuntu -c 'cp settings.js settings.js.backup'", {
                    cwd: "/home/ubuntu/.node-red"
                }),
                ec2.InitCommand.shellCommand(`su ubuntu -c 'aws s3 cp ${node_red_settings.s3ObjectUrl} settings.js'`, {
                    cwd: "/home/ubuntu/.node-red"
                }),
                ec2.InitCommand.shellCommand(`su ubuntu -c 'aws s3 cp ${node_red_flows.s3ObjectUrl} flows.json'`, {
                    cwd: "/home/ubuntu/.node-red"
                }),
                ec2.InitCommand.shellCommand("su ubuntu -c 'npm install lodash traverse node-red-contrib-opcua-server'", {
                    cwd: "/home/ubuntu/.node-red"
                }),
                ec2.InitCommand.shellCommand("su ubuntu -c 'pm2 restart node-red'"),
                ec2.InitCommand.shellCommand("su ubuntu -c 'pm2 save'"),
                ec2.InitCommand.shellCommand("nginx -t"),
                ec2.InitCommand.shellCommand("service nginx reload"),
                ec2.InitCommand.shellCommand("service greengrass status")
            ),
        });

        // Create sitewise gateway
        const sitewise_gateway = new sitewise.CfnGateway(
            this,
            "SitewiseGateway",
            {
                gatewayName: `${iot_thing_cert_policy.thingName}-Gateway`,
                gatewayPlatform: {
                    greengrassV2: {
                        coreDeviceThingName: iot_thing_cert_policy.thingName
                    }
                },
                gatewayCapabilitySummaries: [
                    {
                        capabilityNamespace: "iotsitewise:opcuacollector:2",
                        capabilityConfiguration: JSON.stringify({
                            sources: [{
                                name: "Node-Red OPC-UA Server",
                                endpoint: {
                                    certificateTrust: { type: "TrustAny" },
                                    endpointUri: "opc.tcp://localhost:54845",
                                    securityPolicy: "NONE",
                                    messageSecurityMode: "NONE",
                                    identityProvider: { type: "Anonymous" },
                                    nodeFilterRules:[]
                                },
                                measurementDataStreamPrefix: ""
                            }]
                        })
                    },
                    {
                        capabilityNamespace: "iotsitewise:publisher:2",
                        capabilityConfiguration: JSON.stringify({
                            SiteWisePublisherConfiguration: {
                                publishingOrder: "TIME_ORDER"
                            }
                        })
                    },
                ]
            }
        );
  
        // Create the deployment with AWS public and stack components, target the thing group
        // and add the components/version/updates
        const greengrass_deployment = new GreengrassV2Deployment(this, "GreengrassDeployment", {
            targetArn: deployment_group.thingGroupArn,
            deploymentName: `${stack.stackName} - Example deployment`,
            component: {
                // Add core public components
                "aws.greengrass.Nucleus": { componentVersion: "2.5.5" },
                "aws.greengrass.Cli": { componentVersion: "2.5.5" },
                "aws.iot.SiteWiseEdgeCollectorOpcua": { componentVersion: "2.1.1" },
                "aws.iot.SiteWiseEdgePublisher": { componentVersion: "2.1.4" },
                "aws.greengrass.StreamManager": { componentVersion: "2.0.14" }
            }
        });
        greengrass_deployment.node.addDependency(sitewise_gateway);
        greengrass_deployment.node.addDependency(opcua_server);

        greengrass_deployment.addComponent({
            "aws.greengrass.LocalDebugConsole": {
                componentVersion: "2.2.3",
                configurationUpdate: {
                    merge: JSON.stringify({ httpsEnabled: "false" })
                }
            }
        });

        // Set stack outputs to be consumed by local processes
        new CfnOutput(this, "IotRoleAliasName", {
            value: greengrass_role_alias.roleAliasName
        });
        new CfnOutput(this, "ThingArn", {
            exportName: `${stack.stackName}-ThingArn`,
            value: iot_thing_cert_policy.thingArn
        });
        new CfnOutput(this, "ThingName", {
            exportName: `${stack.stackName}-ThingName`,
            value: `${stack.stackName}-Greengrass-Core`
        });
        new CfnOutput(this, "IotPolicyArn", {
            value: iot_thing_cert_policy.iotPolicyArn
        });
        new CfnOutput(this, "RoleAliasArn", {
            value: greengrass_role_alias.roleAliasArn
        });
        new CfnOutput(this, "IamRoleArn", {
            exportName: `${stack.stackName}-IamRoleArn`,
            value: greengrass_role_alias.iamRoleArn
        });
        new CfnOutput(this, "CertificateArn", {
            exportName: `${stack.stackName}-CertificateArn`,
            value: iot_thing_cert_policy.certificateArn
        });
        new CfnOutput(this, "CertificatePemParameter", {
            value: iot_thing_cert_policy.certificatePemParameter
        });
        new CfnOutput(this, "PrivateKeySecretParameter", {
            value: iot_thing_cert_policy.privateKeySecretParameter
        });
        new CfnOutput(this, "DataAtsEndpointAddress", {
            value: iot_thing_cert_policy.dataAtsEndpointAddress
        });
        new CfnOutput(this, "CredentialProviderEndpointAddress", {
            value: iot_thing_cert_policy.credentialProviderEndpointAddress
        });

        new CfnOutput(this, "NodeRedUrl", {
            value: `http://${opcua_server.instancePublicIp}/node-red`,
            description: 'The URL to access Node-RED',
            exportName: 'NodeRedUrl'
        });

        new CfnOutput(this, "NodeRedUsername", {
            value: "admin",
            description: 'The username to access Node-RED',
            exportName: 'NodeRedUsername'
        });

        new CfnOutput(this, "NodeRedPassword", {
            value: "password",
            description: 'The password to access Node-RED',
            exportName: 'NodeRedPassword'
        });

        new CfnOutput(this, "OpcuaEndpoint", {
            value: `opc.tcp://${opcua_server.instancePublicIp}:54845`,
            description: 'OPC-UA Endpoint',
            exportName: 'OpcuaEndpoint'
        });
    }
}
