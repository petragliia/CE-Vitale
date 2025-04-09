import UIKit
import Capacitor

@objc(MainViewController)
class MainViewController: CAPBridgeViewController {
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        // Configure Capacitor
        self.bridge?.setServerURL(URL(string: "http://localhost:8080")!)
        
        // Configure WebView settings
        self.webView?.configuration.userContentController.add(self, name: "App")
        
        // Set initial URL
        if let url = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "www") {
            self.webView?.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
    }
    
    // MARK: - User Content Controller
    
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "App" {
            // Handle messages from JavaScript
            print("Received message: \(message.body)")
        }
    }
}
