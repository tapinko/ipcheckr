FROM node:20-alpine AS client-build
WORKDIR /client
COPY Src/IPCheckr.Client/package*.json Src/IPCheckr.Client/tsconfig*.json Src/IPCheckr.Client/vite.config.ts ./
COPY Src/IPCheckr.Client/public ./public
COPY Src/IPCheckr.Client/src ./src
COPY Src/IPCheckr.Client/index.html .
RUN npm ci
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS api-build
WORKDIR /src
COPY Src/IPCheckr.Api/IPCheckr.Api.csproj Src/IPCheckr.Api/
RUN dotnet restore Src/IPCheckr.Api/IPCheckr.Api.csproj
COPY Src/IPCheckr.Api/ Src/IPCheckr.Api/
RUN mkdir -p Src/IPCheckr.Api/wwwroot
COPY --from=client-build /client/dist/ Src/IPCheckr.Api/wwwroot/
WORKDIR /src/Src/IPCheckr.Api
RUN dotnet publish -c Release -o /app/publish -p:UseAppHost=false -p:DebugType=None -p:SkipCopyingSymbols=true

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine AS final
WORKDIR /app
ENV ASPNETCORE_URLS=https://0.0.0.0:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

RUN apk add --no-cache openldap ca-certificates openssl \
    && update-ca-certificates \
    && if [ ! -e /usr/lib/libldap-2.5.so.0 ]; then ln -s /usr/lib/libldap.so.2 /usr/lib/libldap-2.5.so.0; fi \
    && if [ ! -e /usr/lib/liblber-2.5.so.0 ]; then ln -s /usr/lib/liblber.so.2 /usr/lib/liblber-2.5.so.0; fi
COPY --from=api-build /app/publish .
COPY Docker/fetch-ldap-cert.sh /app/fetch-ldap-cert.sh
RUN chmod +x /app/fetch-ldap-cert.sh
EXPOSE 8080
ENTRYPOINT ["/app/fetch-ldap-cert.sh"]