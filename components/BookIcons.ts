// List of all available book icons
export const BOOK_ICONS = [
  'BookType 1 -Black.png',
  'BookType 1 -Blue.png',
  'BookType 1 -Gray.png',
  'BookType 1 -Green.png',
  'BookType 1 -Orange (1).png',
  'BookType 1 -Orange.png',
  'BookType 1 -Pink.png',
  'BookType 1 -Purple.png',
  'BookType 2 -Aqua.png',
  'BookType 2 -Black.png',
  'BookType 2 -Blue.png',
  'BookType 2 -Gray.png',
  'BookType 2 -Green.png',
  'BookType 2 -Mauve.png',
  'BookType 2 -Orange.png',
  'BookType 2 -Pink.png',
  'BookType 2 -Purple.png',
  'BookType 2 -Red.png',
  'BookType 2 -Yellow.png',
  'BookType 3 -Aqua.png',
  'BookType 3 -Black.png',
  'BookType 3 -Blue.png',
  'BookType 3 -Green.png',
  'BookType 3 -Grey.png',
  'BookType 3 -Lavendar.png',
  'BookType 3 -Orange.png',
  'BookType 3 -Pink.png',
  'BookType 3 -Purple.png',
  'BookType 3 -Red.png',
  'BookType 3 -Yellow.png',
];

// Helper function to get icon source
export const getBookIconSource = (iconName?: string) => {
  if (!iconName) {
    return require('../assets/images/BookType 1 -Blue.png');
  }
  
  // Map icon names to require statements
  const iconMap: { [key: string]: any } = {
    'BookType 1 -Black.png': require('../assets/images/BookType 1 -Black.png'),
    'BookType 1 -Blue.png': require('../assets/images/BookType 1 -Blue.png'),
    'BookType 1 -Gray.png': require('../assets/images/BookType 1 -Gray.png'),
    'BookType 1 -Green.png': require('../assets/images/BookType 1 -Green.png'),
    'BookType 1 -Orange (1).png': require('../assets/images/BookType 1 -Orange (1).png'),
    'BookType 1 -Orange.png': require('../assets/images/BookType 1 -Orange.png'),
    'BookType 1 -Pink.png': require('../assets/images/BookType 1 -Pink.png'),
    'BookType 1 -Purple.png': require('../assets/images/BookType 1 -Purple.png'),
    'BookType 2 -Aqua.png': require('../assets/images/BookType 2 -Aqua.png'),
    'BookType 2 -Black.png': require('../assets/images/BookType 2 -Black.png'),
    'BookType 2 -Blue.png': require('../assets/images/BookType 2 -Blue.png'),
    'BookType 2 -Gray.png': require('../assets/images/BookType 2 -Gray.png'),
    'BookType 2 -Green.png': require('../assets/images/BookType 2 -Green.png'),
    'BookType 2 -Mauve.png': require('../assets/images/BookType 2 -Mauve.png'),
    'BookType 2 -Orange.png': require('../assets/images/BookType 2 -Orange.png'),
    'BookType 2 -Pink.png': require('../assets/images/BookType 2 -Pink.png'),
    'BookType 2 -Purple.png': require('../assets/images/BookType 2 -Purple.png'),
    'BookType 2 -Red.png': require('../assets/images/BookType 2 -Red.png'),
    'BookType 2 -Yellow.png': require('../assets/images/BookType 2 -Yellow.png'),
    'BookType 3 -Aqua.png': require('../assets/images/BookType 3 -Aqua.png'),
    'BookType 3 -Black.png': require('../assets/images/BookType 3 -Black.png'),
    'BookType 3 -Blue.png': require('../assets/images/BookType 3 -Blue.png'),
    'BookType 3 -Green.png': require('../assets/images/BookType 3 -Green.png'),
    'BookType 3 -Grey.png': require('../assets/images/BookType 3 -Grey.png'),
    'BookType 3 -Lavendar.png': require('../assets/images/BookType 3 -Lavendar.png'),
    'BookType 3 -Orange.png': require('../assets/images/BookType 3 -Orange.png'),
    'BookType 3 -Pink.png': require('../assets/images/BookType 3 -Pink.png'),
    'BookType 3 -Purple.png': require('../assets/images/BookType 3 -Purple.png'),
    'BookType 3 -Red.png': require('../assets/images/BookType 3 -Red.png'),
    'BookType 3 -Yellow.png': require('../assets/images/BookType 3 -Yellow.png'),
  };
  
  return iconMap[iconName] || require('../assets/images/BookType 1 -Blue.png');
};

