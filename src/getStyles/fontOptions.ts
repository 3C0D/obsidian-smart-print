// Central font options for both settings and modal and CSS generation
export const FONT_OPTIONS = [
    { 
        value: 'system', 
        label: 'System Default',
        css: 'var(--print-font-family, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji")'
    },
    
    // Sans-serif fonts
    { 
        value: 'sans-serif', 
        label: 'Sans-serif Generic',
        css: 'sans-serif'
    },
    { 
        value: 'arial', 
        label: 'Arial',
        css: 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif'
    },
    { 
        value: 'helvetica', 
        label: 'Helvetica',
        css: '"Helvetica Neue", Helvetica, Arial, "Liberation Sans", sans-serif'
    },
    { 
        value: 'segoe', 
        label: 'Segoe UI',
        css: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", sans-serif'
    },
    { 
        value: 'roboto', 
        label: 'Roboto',
        css: 'Roboto, "Segoe UI", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'
    },
    { 
        value: 'ubuntu', 
        label: 'Ubuntu',
        css: 'Ubuntu, "Liberation Sans", "DejaVu Sans", Arial, sans-serif'
    },
    { 
        value: 'opensans', 
        label: 'Open Sans',
        css: '"Open Sans", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    { 
        value: 'lato', 
        label: 'Lato',
        css: 'Lato, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    },
    
    // Serif fonts
    { 
        value: 'serif', 
        label: 'Serif Generic',
        css: 'serif'
    },
    { 
        value: 'times', 
        label: 'Times New Roman',
        css: '"Times New Roman", Times, "Liberation Serif", "DejaVu Serif", serif'
    },
    { 
        value: 'georgia', 
        label: 'Georgia',
        css: 'Georgia, "Times New Roman", Times, "Liberation Serif", serif'
    },
    { 
        value: 'garamond', 
        label: 'Garamond',
        css: 'Garamond, "EB Garamond", "Times New Roman", serif'
    },
    { 
        value: 'palatino', 
        label: 'Palatino',
        css: '"Palatino Linotype", Palatino, "Book Antiqua", "URW Palladio L", serif'
    },
    
    // Monospace fonts
    { 
        value: 'monospace', 
        label: 'Monospace Generic',
        css: 'monospace'
    },
    { 
        value: 'courier', 
        label: 'Courier New',
        css: '"Courier New", Courier, "Liberation Mono", "DejaVu Sans Mono", monospace'
    },
    { 
        value: 'consolas', 
        label: 'Consolas',
        css: 'Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace'
    },
    { 
        value: 'firacode', 
        label: 'Fira Code',
        css: '"Fira Code", "Source Code Pro", Consolas, "Liberation Mono", monospace'
    },
    
    // Special/Display fonts
    { 
        value: 'comic', 
        label: 'Comic Sans MS',
        css: '"Comic Sans MS", "Comic Sans", "Chalkboard SE", "Comic Neue", cursive, sans-serif'
    },
    { 
        value: 'impact', 
        label: 'Impact',
        css: 'Impact, "Franklin Gothic Bold", "Helvetica Inserat", "Bitstream Vera Sans Bold", sans-serif'
    },
    { 
        value: 'trebuchet', 
        label: 'Trebuchet MS',
        css: '"Trebuchet MS", "Liberation Sans", "DejaVu Sans", sans-serif'
    },
    { 
        value: 'verdana', 
        label: 'Verdana',
        css: 'Verdana, "DejaVu Sans", "Liberation Sans", sans-serif'
    }
];