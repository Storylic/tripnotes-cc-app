# tripnotes-cc/scripts/vercel_check.sh
#!/bin/sh
pnpm next lint && echo "✅ Ready for Vercel" || echo "❌ Fix issues before deploy"
