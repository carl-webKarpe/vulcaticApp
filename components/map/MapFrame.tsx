import { forwardRef, useImperativeHandle, useRef, type ComponentType, type Ref } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewProps } from 'react-native-webview';

// react-native-webview's class typings don't match React 19's JSX types yet; this keeps them happy.
const WebViewView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebView> }>;

export type MapMessage = { type: string; [key: string]: unknown };
export type MapFrameHandle = { send: (msg: MapMessage) => void };
type Props = { html: string; onMessage: (msg: MapMessage) => void };

/** Phone version: the map page runs inside a WebView. */
export const MapFrame = forwardRef<MapFrameHandle, Props>(function MapFrame({ html, onMessage }, ref) {
  const webview = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    send: (msg) => webview.current?.injectJavaScript(`window.handleMsg && window.handleMsg(${JSON.stringify(msg)});true;`),
  }));

  return (
    <WebViewView
      ref={webview}
      originWhitelist={['*']}
      source={{ html, baseUrl: 'https://vulcatic.app/' }}
      style={styles.web}
      onMessage={(e) => {
        try {
          onMessage(JSON.parse(e.nativeEvent.data));
        } catch {}
      }}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      overScrollMode="never"
      bounces={false}
      scrollEnabled={false}
    />
  );
});

const styles = StyleSheet.create({ web: { flex: 1, backgroundColor: '#dfe9ef' } });
