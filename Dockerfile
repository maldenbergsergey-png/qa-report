FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4173
ENV REPORTS_DB_PATH=/app/reports-data/qa-report.sqlite
ENV AGENT_RELEASE_DIR=/app/agent-releases

COPY --chown=node:node package.json ./
COPY --chown=node:node server.js agent-release-server.js app.js jira-markup-import.js checklist-selection.js checklist-table.js checklist-numbering.js release-notes.js index.html styles.css favicon.svg ./
COPY --chown=node:node pwa.js sw.js manifest.webmanifest ./
COPY --chown=node:node local-import-server.js jira-attachment-transfer.js attachment-import.js jira-attachment-reuse.js local-import-client.js ./
COPY --chown=node:node icons ./icons
COPY --chown=node:node downloads/*.zip ./downloads/
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node agent-update-feed ./agent-releases
RUN mkdir -p /app/agent-releases /app/feedback-data /app/reports-data && chown -R node:node /app/feedback-data /app/reports-data

USER node

EXPOSE 4173

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4173/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
