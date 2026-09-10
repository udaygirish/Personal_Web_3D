// ========================================
// Wormhole Configuration
// ========================================

const WORMHOLE_CONFIG = [
    { id: 'command', label: 'Command Deck', color: 0xf4c77e, position: { x: 100, y: 80, z: -350 }, destination: './command/index.html' },
    {
        id: 'personal',
        label: 'Personal',
        color: 0x00ff88,        // Green — hard LEFT, mid depth
        position: { x: -160, y: 10, z: -160 },
        destination: './personal/index.html'
    },
    {
        id: 'work',
        label: 'Work',
        color: 0x06ffa5,        // Cyan — hard RIGHT, mid depth
        position: { x: 160, y: -10, z: -160 },
        destination: './work/index.html'
    },
    {
        id: 'blog',
        label: 'Blog',
        color: 0xff6b35,        // Orange — BELOW and slightly left
        position: { x: -30, y: -100, z: -200 },
        destination: './blog/index.html'
    },
    {
        id: 'my_world_view',
        label: 'My World View',
        color: 0x4cc9f0,        // Cyan/Blue — ABOVE and slightly right
        position: { x: 30, y: 100, z: -200 },
        destination: './my_world_view/index.html'
    },
    {
        id: 'my_web',
        label: 'Research',
        color: 0x9d4edd,        // Purple — straight AHEAD, far
        position: { x: 0, y: 0, z: -320 },
        destination: './my_web/index.html'
    }
];

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WORMHOLE_CONFIG };
}
