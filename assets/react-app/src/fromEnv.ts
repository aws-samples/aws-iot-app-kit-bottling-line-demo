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

import { CredentialProvider } from "@aws-sdk/types";

// REACT_APP prefix so that react-app picks them up by default
const ENV_KEY = "REACT_APP_AWS_ACCESS_KEY_ID";
const ENV_SECRET = "REACT_APP_AWS_SECRET_ACCESS_KEY";
const ENV_SESSION = "REACT_APP_AWS_SESSION_TOKEN";
const ENV_EXPIRATION = "REACT_APP_AWS_CREDENTIAL_EXPIRATION";

export const fromEnvReactApp = (): CredentialProvider => {
    return () => {
            const accessKeyId = process.env[ENV_KEY];
            const secretAccessKey = process.env[ENV_SECRET];
            const expiry = process.env[ENV_EXPIRATION];
            if (accessKeyId && secretAccessKey) {
                return Promise.resolve({
                    accessKeyId: accessKeyId,
                    secretAccessKey: secretAccessKey,
                    sessionToken: process.env[ENV_SESSION],
                    expiration: expiry ? new Date(expiry) : undefined,
                });
        };
        return Promise.reject(new Error("Unable to find environment variable credentials. Expected REACT_APP_AWS_ACCESS_KEY_ID and REACT_APP_AWS_SECRET_ACCESS_KEY to be defined"));
    }
}