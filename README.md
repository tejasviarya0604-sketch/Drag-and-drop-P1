# Drag-and-drop prototype

Open `index.html` or `taskbar.html` in a browser. Both use the shared universal composer.

Permanent hosted preview: https://tejasviarya0604-sketch.github.io/Drag-and-drop-P1/

## Merge and share using Outlook

1. Drag files from the desktop or File Explorer into the taskbar composer.
2. Type `Merge this and send it to Daisy on Outlook`, then press Enter or Run.
3. The Share Agent displays connecting and merging states, then an Outlook draft addressed to Daisy Macguire.
4. Edit the recipient, subject, or message. You can also type a replacement message in the composer and press Enter to apply it.
5. Select Send to show the simulated sending and completion states. Completion adds a preview PDF to a new **Medical reports and bills** desktop folder. Open the saved folder or use Undo to remove the saved preview.

Typing only `merge this` first shows a merged-PDF preview. Choose **Share using Outlook**, or type `Send this to Daisy on Outlook` and press Enter, to continue to the draft. The attachment suggestions offer the same flow.

Cancel or the back arrow returns to the prompt without removing attachments. Changing attachments cancels an in-progress merge or draft so it cannot send stale files. Folders are not supported as merge inputs.

The share sheet uses Daisy's supplied profile image from `Assets for UC/Daisy mcguire.png`. The draft, sending, and success layouts follow Figma nodes `459:298683`, `459:301470`, and `462:303658`, with Daisy named consistently throughout the flow.

This is a UI simulation. It does not merge file contents, connect to Outlook, or send real email. The displayed PDF and 25MB size are design placeholders, not generated file data. Original files are never modified.
