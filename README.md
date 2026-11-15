# EnigmaLockApp 🔮

A hyper-realistic iOS 18 lock-screen mind-reading engine based on **Christian Grace's *Enigma*** system.

## Features
- **Authentic iOS 18 Lock Screen**: Dynamic clock, real date, status bar, passcode dots, and tactile keypad.
- **Custom Wallpaper**: Set your own real iPhone wallpaper from your photo library so it looks 100% indistinguishable from your actual locked phone.
- **Direct Real Safari Handoff**: Automatically exits Aura Browser and launches native **MobileSafari** directly into real Google Search using the `x-safari-https` URL scheme.
- **Smart Multiple Candidate Picker**: If the 4-digit code matches multiple words (e.g. *Glass*, *Brick*, *Drill*), a native Spotlight-style sheet slides down allowing a discrete 1-tap selection that immediately launches Google.
- **Offline Dictionary**: Hundreds of pre-indexed words across Everyday Objects, Animals, Countries/Cities, and Food.

## The 4-Digit Enigma Code:
1. **Digit 1**: Word Length (`3`–`9`, `0` for 10, `1` for 11+)
2. **Digit 2**: Position of 1st Vowel
3. **Digit 3**: Position of 2nd Vowel (or 1st letter shape if only 1 vowel)
4. **Digit 4**: Shape of 1st Capital Letter (`1` = Straight, `2` = Mixed, `3` = Curved)

## Secret Controls:
- **Open Settings**: Tap "Emergency" (bottom left) or long-press the Padlock icon.
- **Upload Wallpaper**: In settings, choose any photo from your phone.
- **Change Category**: Everyday Objects (default), Animals, Countries/Cities, Food, or All Words.
- **Practice Mode**: Test any word to get its exact code.
