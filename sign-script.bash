cp -r src test_auto_sign
jq --argjson inc 1 '.version |= (split(".") | .[-1] = ((.[-1] | tonumber) + $inc | tostring) | join("."))' src/manifest.json > tmp.$$.json && mv tmp.$$.json src/manifest.json
cd build
# web-ext sign --channel=unlisted --api-key=user:18580622:843 --api-secret=713db2576b93754f7da7f74bc044d5e8ac75fc745744b7aee0320af3bca3053e
