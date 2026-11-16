import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type RefreshControlProps,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_CONTENT_WIDTH, spacing, useTheme } from '@/theme';

import { pressedDip } from './press';

type TextVariant = 'title' | 'heading' | 'body' | 'small' | 'label';

const textStyles: Record<TextVariant, TextStyle> = {
  title: { fontSize: 28, fontWeight: '800' },
  heading: { fontSize: 18, fontWeight: '700' },
  body: { fontSize: 16, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
};

export function AppText({
  variant = 'body',
  muted,
  style,
  ...rest
}: TextProps & { variant?: TextVariant; muted?: boolean }) {
  const { colors } = useTheme();
  return (
    <Text
      {...rest}
      style={[textStyles[variant], { color: muted ? colors.textMuted : colors.text }, style]}
    />
  );
}

export function Card({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Scrollable page with centred max-width content. */
export function Screen({
  children,
  title,
  scroll = true,
  safeTop = false,
  maxWidth,
}: {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  /** Keep the content below the status bar / notch. Only for screens WITHOUT a native header (a header does this itself). */
  safeTop?: boolean;
  /** Widest the content may get on a large screen (default: MAX_CONTENT_WIDTH). For pages that lay out columns. */
  maxWidth?: number;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={maxWidth === undefined ? styles.content : [styles.content, { maxWidth }]}>
      {title ? <AppText variant="title" style={styles.pageTitle}>{title}</AppText> : null}
      {children}
    </View>
  );
  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: safeTop ? insets.top : 0 }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content}</ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

const PRESS_IN_MS = 120;
const PRESS_OUT_MS = 160;
const SPINNER_FADE_MS = 150;

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}) {
  const { colors, shape } = useTheme();
  const bg =
    variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.surfaceAlt : 'transparent';
  const fg = variant === 'primary' ? colors.onPrimary : colors.text;

  // The scale is animated (the UI "hears" the tap); the opacity dip is instant, like every other tappable.
  const [scale] = useState(() => new Animated.Value(1));
  // The label ↔ spinner swap crossfades in, but resets instantly on stop: returning to the label must not
  // lag behind the (already finished) action.
  const [fade] = useState(() => new Animated.Value(loading ? 1 : 0));
  useEffect(() => {
    if (loading) {
      Animated.timing(fade, {
        toValue: 1,
        duration: SPINNER_FADE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      fade.setValue(0);
    }
  }, [loading, fade]);

  const pressIn = () => {
    Animated.timing(scale, {
      toValue: 0.97,
      duration: PRESS_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };
  const pressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: PRESS_OUT_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.button, disabled ? { opacity: 0.5 } : pressedDip(pressed)]}>
      <Animated.View
        style={[
          styles.buttonSurface,
          {
            backgroundColor: bg,
            // Half of minHeight: a pill for one line, and a rounded rectangle (not an oval) when a long label wraps onto two.
            borderRadius: shape.circle(BUTTON_MIN_HEIGHT),
            transform: [{ scale }],
          },
        ]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.buttonSlot, { opacity: fade, display: loading ? 'flex' : 'none' }]}>
          <ActivityIndicator color={fg} />
        </Animated.View>
        <Animated.Text
          style={[
            styles.buttonLabel,
            styles.buttonSlot,
            { color: fg, opacity: fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) },
          ]}>
          {label}
        </Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const BUTTON_MIN_HEIGHT = 46;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pageTitle: { marginTop: spacing.sm },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  button: {
    minHeight: BUTTON_MIN_HEIGHT,
  },
  // The animated surface fills the (min-height) button; the label and spinner share one centred slot so the
  // crossfade between them never changes the button's height.
  buttonSurface: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: BUTTON_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSlot: { position: 'absolute', width: '100%', alignItems: 'center' },
  // Centred, so a label that has to wrap (two buttons sharing a row) still sits in the middle of its pill.
  buttonLabel: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
});

/**
 * The app's RefreshControl: one place for the platform details (Android needs a coloured spinner track,
 * iOS just a tint) so the six pull-to-refresh screens stay consistent by construction.
 */
export function AppRefreshControl(props: RefreshControlProps): ReactNode {
  const { colors } = useTheme();
  return <RefreshControl {...props} tintColor={colors.primary} progressBackgroundColor={colors.surface} />;
}
