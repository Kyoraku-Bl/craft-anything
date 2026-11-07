.class public Lcom/dimalingo/app/DimaChromeClient;
.super Landroid/webkit/WebChromeClient;

.method public constructor <init>()V
    .locals 0
    invoke-direct {p0}, Landroid/webkit/WebChromeClient;-><init>()V
    return-void
.end method

# Grant only audio, only to the production HTTPS origin. Android enforces
# WebView resources. The activity requests the OS permission on startup.
.method public onPermissionRequest(Landroid/webkit/PermissionRequest;)V
    .locals 5
    if-eqz p1, :done
    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->getOrigin()Landroid/net/Uri;
    move-result-object v0
    if-eqz v0, :deny
    const-string v1, "https"
    invoke-virtual {v0}, Landroid/net/Uri;->getScheme()Ljava/lang/String;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/lang/String;->equalsIgnoreCase(Ljava/lang/String;)Z
    move-result v2
    if-eqz v2, :deny
    const-string v1, "dimalingo.vercel.app"
    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;
    move-result-object v2
    invoke-virtual {v1, v2}, Ljava/lang/String;->equalsIgnoreCase(Ljava/lang/String;)Z
    move-result v2
    if-eqz v2, :deny
    invoke-virtual {v0}, Landroid/net/Uri;->getPort()I
    move-result v2
    const/4 v3, -0x1
    if-eq v2, v3, :check_resource
    const/16 v3, 0x1bb
    if-ne v2, v3, :deny
    :check_resource
    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->getResources()[Ljava/lang/String;
    move-result-object v0
    if-eqz v0, :deny
    const/4 v2, 0x0
    array-length v3, v0
    const-string v1, "android.webkit.resource.AUDIO_CAPTURE"
    :loop
    if-ge v2, v3, :deny
    aget-object v4, v0, v2
    invoke-virtual {v1, v4}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v4
    if-nez v4, :grant_audio
    add-int/lit8 v2, v2, 0x1
    goto :loop
    :grant_audio
    const/4 v2, 0x1
    new-array v0, v2, [Ljava/lang/String;
    const/4 v2, 0x0
    aput-object v1, v0, v2
    invoke-virtual {p1, v0}, Landroid/webkit/PermissionRequest;->grant([Ljava/lang/String;)V
    goto :done
    :deny
    invoke-virtual {p1}, Landroid/webkit/PermissionRequest;->deny()V
    :done
    return-void
.end method
