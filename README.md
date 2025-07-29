# diagnexus-serverless-backend
this repo having daignexus app's backend for patient report analysis &amp; send recommendation to patient  


<!-- command to prepare deployment pkg -->

mkdir lambda-package
cp -r dist/* lambda-package/
cp package.json lambda-package/
cp -r node_modules lambda-package/
cp .env lambda-package/


Compress-Archive -Path .\lambda-package\* -DestinationPath lambda.zip


s3://diagnexus-deployement-pkg/lambda.zip