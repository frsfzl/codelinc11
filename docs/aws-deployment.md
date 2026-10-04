# AWS Amplify deployment

Deploy the GitHub repository's `main` branch to Amplify Hosting in `us-east-1`, using the Next.js SSR (`WEB_COMPUTE`) platform and the checked-in `amplify.yml` build specification. Node.js 22 is selected by the build.

## Production configuration

Create a Secrets Manager secret for the ElevenLabs API key. Its value may be the raw key or JSON with an `ELEVENLABS_API_KEY` property. Do not add the actual API key to Amplify build variables, source control, or `NEXT_PUBLIC_` variables.

Set these Amplify build variables for `main`:

| Variable                | Value                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`            | The exact HTTPS origin, such as `https://main.APP_ID.amplifyapp.com`, with no trailing slash |
| `ELEVENLABS_AGENT_ID`   | The configured Linc agent ID                                                                 |
| `ELEVENLABS_SECRET_ARN` | The complete ARN of the production key's Secrets Manager secret                              |

The build copies only these three non-secret settings to `.env.production`. It explicitly disables the local CLI bridge. At request time, the Node server obtains the key using its SSR compute role and caches it in server memory for up to five minutes. No secret value is written to build output or client code.

## IAM roles

Amplify needs its normal deployment service role. Separately, attach an SSR compute role to the `main` branch. Trust `amplify.amazonaws.com` to assume that role. Give it `secretsmanager:GetSecretValue` on only the exact secret ARN. If using a customer-managed KMS key, also grant the necessary decrypt permission on that key. Do not attach the production compute role to pull-request previews or automatically created branches.

The identity performing deployment needs Amplify app/branch/job management and permission to create or pass these specific roles. An existing identity that is denied `amplify:ListApps` cannot be used to verify or manage the deployment until an account administrator grants the required access.

## Connect and verify

1. Connect the GitHub repository to Amplify using the authorized GitHub account; select `main`.
2. Configure the deployment and compute roles and the variables above.
3. Add the deployed HTTPS hostname to the ElevenLabs agent's allowed hosts, keeping any development hosts still in use.
4. Start the build and inspect the build/deployment logs.
5. Open the HTTPS homepage and conversation page. Verify text session creation, realtime transcription token creation, and one live conversation without logging credentials or signed session URLs.

The application stores the planning session in browser memory. No DynamoDB database is required to host its current features. The existing process-local request limits are demo guards; a wider public launch needs a durable rate limiter and appropriate access controls.

References: [Amplify Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html), [SSR environment variables](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-environment-variables.html), [SSR compute roles](https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html).
