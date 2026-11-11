# Ajustes v28: estilo iOS, informes refinados y descargables nuevos
rep("const APP_VERSION = '27.0';", "const APP_VERSION = '28.0';")
rep("family=Bricolage+Grotesque:", "family=Inter:wght@400;500;600;700;800&family=Bricolage+Grotesque:")
rep('<meta name="theme-color"', '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="theme-color"', 1) if s.count('<meta name="theme-color"') == 1 else None
