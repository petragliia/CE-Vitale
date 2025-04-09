import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WKNavigationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        print("AppDelegate: Application did finish launching")
        print("AppDelegate: Checking directories...")
        
        // Verificar diretórios
        let fileManager = FileManager.default
        let appSupport = NSSearchPathForDirectoriesInDomains(.applicationSupportDirectory, .userDomainMask, true).first!
        let documents = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true).first!
        print("AppDelegate: App Support Directory: \(appSupport)")
        print("AppDelegate: Documents Directory: \(documents)")
        
        // Criar a janela principal
        window = UIWindow(frame: UIScreen.main.bounds)
        
        // Criar e configurar o MainViewController
        let viewController = CAPBridgeViewController()
        
        // Configurar WebView
        if let webView = viewController.webView {
            print("AppDelegate: WebView created successfully")
            webView.configuration.preferences.javaScriptEnabled = true
            webView.configuration.preferences.javaScriptCanOpenWindowsAutomatically = true
            webView.configuration.userContentController.add(self, name: "App")
            
            // Configurar sandbox
            webView.configuration.websiteDataStore = .nonPersistent()
            webView.configuration.processPool = WKProcessPool()
            
            // Configurar o UserAgent
            webView.configuration.applicationNameForUserAgent = "Vitale/1.0"
            
            // Configurar o conteúdo web
            webView.configuration.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
            webView.configuration.preferences.setValue(true, forKey: "allowUniversalAccessFromFileURLs")
            
            // Definir o delegate para monitorar o carregamento
            webView.navigationDelegate = self
            
            // Verificar configuração do WebView
            print("AppDelegate: WebView configuration:")
            print("AppDelegate: - JavaScript Enabled: \(webView.configuration.preferences.javaScriptEnabled)")
            print("AppDelegate: - File Access: \(webView.configuration.preferences.value(forKey: "allowFileAccessFromFileURLs") ?? "false")")
            print("AppDelegate: - UserAgent: \(webView.configuration.applicationNameForUserAgent)")
        } else {
            print("AppDelegate: Failed to create WebView")
        }
        
        // Carregar o arquivo index.html
        print("AppDelegate: Attempting to load index.html...")
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "App/public") {
            print("AppDelegate: Found index.html at: \(url.absoluteString)")
            
            // Verificar conteúdo do arquivo
            do {
                let content = try String(contentsOf: url)
                print("AppDelegate: File content length: \(content.count)")
                print("AppDelegate: First 100 characters: \(String(content.prefix(100)))")
            } catch {
                print("AppDelegate: Error reading file: \(error)")
            }
            
            viewController.webView?.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        } else {
            print("AppDelegate: Could not find index.html in App/public")
            // Tentar carregar do diretório build
            if let buildUrl = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "build") {
                print("AppDelegate: Found index.html in build directory: \(buildUrl.absoluteString)")
                viewController.webView?.loadFileURL(buildUrl, allowingReadAccessTo: buildUrl.deletingLastPathComponent())
            } else {
                print("AppDelegate: Could not find index.html in build directory")
            }
        }
        
        // Configurar a janela
        window?.rootViewController = viewController
        window?.makeKeyAndVisible()
        
        // Verificar se a janela e o view controller estão configurados corretamente
        if let rootVC = window?.rootViewController {
            print("AppDelegate: Root view controller set successfully")
            if let webView = rootVC.view as? WKWebView {
                print("AppDelegate: WebView is properly set as root view")
            } else {
                print("AppDelegate: Root view is not a WKWebView")
            }
        } else {
            print("AppDelegate: Failed to set root view controller")
        }
        
        return true
    }
    
    // MARK: - WKNavigationDelegate Methods
    
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        print("AppDelegate: WebView finished loading successfully")
        
        // Verificar se o WebView está carregado e visível
        if let webView = window?.rootViewController?.view as? WKWebView {
            print("AppDelegate: WebView is loaded and visible")
            
            // Verificar se o JavaScript está habilitado
            print("AppDelegate: JavaScript Enabled: \(webView.configuration.preferences.javaScriptEnabled)")
            
            // Verificar o conteúdo da página
            webView.evaluateJavaScript("document.readyState") { result, error in
                if let error = error {
                    print("AppDelegate: Error evaluating JavaScript: \(error)")
                } else if let result = result as? String {
                    print("AppDelegate: Document ready state: \(result)")
                }
            }
        }
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("AppDelegate: WebView failed to load")
        print("AppDelegate: Error: \(error)")
        
        // Verificar tipo do erro
        if let nsError = error as NSError? {
            print("AppDelegate: Error domain: \(nsError.domain)")
            print("AppDelegate: Error code: \(nsError.code)")
            
            // Verificar URL que falhou
            if let failedURL = webView.url {
                print("AppDelegate: Failed URL: \(failedURL.absoluteString)")
            }
        }
    }
    
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("AppDelegate: WebView failed provisional navigation")
        print("AppDelegate: Error: \(error)")
    }
    
    func applicationWillResignActive(_ application: UIApplication) {
        print("AppDelegate: Application will resign active")
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        print("AppDelegate: Application entered background")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        print("AppDelegate: Application will enter foreground")
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        print("AppDelegate: Application did become active")
    }

    func applicationWillTerminate(_ application: UIApplication) {
        print("AppDelegate: Application will terminate")
    }
}

extension AppDelegate: WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "App" {
            print("AppDelegate: Received message from JavaScript: \(message.body)")
        }
    }
}
