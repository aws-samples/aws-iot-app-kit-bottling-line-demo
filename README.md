# AWS IoT Application Kit Demo

[AWS IoT Application Kit](https://github.com/awslabs/iot-app-kit) is an open source client-side library that enables IoT application developers to simplify the development of complex IoT applications by leveraging performant reusable components from AWS IoT App Kit which abstract critical technical considerations expected from a realtime web application - handling streaming data, caching, preloading data, dynamic aggregation and preventing request fragmentation. This abstraction allows IoT application developers to focus on building custom user experiences and worrying less about underlying technical complexities.

![AWS IoT App Kit Demo Screenshot](https://user-images.githubusercontent.com/1389495/157766765-de773c12-e58e-43b5-9c3e-f9ca0450d250.png)

This project deploys an AWS CDK stack named `OpcuaSimulatorStack` which deploys the following AWS resources to create a Node-RED based OPC-UA server simulating telemetry for an industrial juice bottling line:
* EC2 Instance with Node-RED, AWS IoT Greengrass V2 core. This Greengrass core device also acts as an AWS IoT Sitewise gateway to ingest simulated telemetry data via OPC-UA.
* AWS IoT Sitewise asset models and corresponding assets representing machines in the bottling line.
* Other AWS IoT resources (AWS IoT Keys and Certificates, Policies, Greengrass deployment) needed by Greengrass.
* A standalone ReactJS application (expected to be run locally) implementing AWS IoT App Kit in `assets/react-app` folder.

![Representation of machines in the industrial bottling line simulated with `OpcuaSimulatorStack`](https://user-images.githubusercontent.com/1389495/157766020-d448363f-0483-41dd-81e5-95860c8fdc76.jpg)
<p align = "center">Representation of machines in the industrial bottling line simulated with OpcuaSimulatorStack.</p>

## 01. Pre-requisites
The following is required to deploy this solution:
* AWS CLI
* AWS CDK
* An AWS CLI profile with permissions to deploy stacks via AWS CloudFormation
* A default VPC present in your AWS account

## 02. Deploying the solution
1. Clone this repository
   ```
   git clone https://github.com/aws-samples/aws-iot-app-kit-demo iot-app-kit-demo
   ```
2. Change to the project directory
   ```
   cd iot-app-kit-demo
   ```
3. Install dependencies for the AWS CDK. Note, this is for the infrastructure only.
   ```
   npm ci
   ```
4. Configure your account and region for CDK deployment.
   ```
   cdk bootstrap aws://<ACCOUNT-NUMBER>/<REGION>
   ```
5. Deploy the cdk stack named *OpcuaSimulatorStack*. When prompted with “Do you wish to deploy these changes (y/n)?” Enter Y.
   ```
   cdk deploy OpcuaSimulatorStack
   ```

## 03. Running ReactJS Demo Application
Please refer to the [README](assets/react-app/README.md) to run the demo ReactJS application locally.

## 04. Other Information

The `cdk.json` file tells the CDK Toolkit how to execute your app.

**Useful commands**

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template
