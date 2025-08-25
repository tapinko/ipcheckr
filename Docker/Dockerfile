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
ENV ASPNETCORE_URLS=http://0.0.0.0:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1
COPY --from=api-build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "IPCheckr.Api.dll"]