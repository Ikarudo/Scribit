Scribit - The Note App

A comprehensive mobile application designed to streamline academic workflows by consolidating note-taking, scheduling, task management, and reminders into a single, unified platform built specifically for students.

## *Check Out The Latest Release!* ##

## Overview ##

Scribit addresses the persistent challenge of fragmented educational tools that fail to meet the comprehensive needs of modern students. While existing solutions like Notion and Microsoft OneNote offer robust organisational capabilities, 
they lack a student-first design philosophy and require users to navigate between multiple applications for related tasks. Scribit solves this by providing an integrated ecosystem where students can manage all their academic responsibilities in one place.

## Features ##

Virtual Notebooks
- Create and organise digital notebooks by subject with customizable colour-coded icons
- Add multiple pages per notebook with timestamped entries
- Mark notebooks as favourites for quick access
- View recently used notebooks for convenient retrieval

Calendar & Scheduling
- Comprehensive calendar with daily and monthly views
- Create events with titles, descriptions, dates, and times
- Colour-coded event organisation for visual clarity
- Support for recurring events (daily, weekly, monthly, yearly)
- Multiple event types: Class Session, School Event, Assignment, Other

Task Management
- Track homework and assignments with customizable priority levels (High, Medium, Low)
- Set due dates and times for tasks
- Mark tasks as completed with progress tracking
- Automatic calendar integration for tasks with due dates
- Optional reminder generation for each task

Reminders
- Create standalone reminders with configurable due dates and times
- Push notifications for upcoming deadlines
- Automatic reminder generation from calendar events
- Track reminder completion status


Secure Authentication
- Firebase Authentication with email/password credentials
- Secure session management

## Technology Stack ##

**Frontend**
- **React Native** - Cross-platform mobile development framework
- **Expo** - Development tools and additional libraries
- **TypeScript** - Type-safe JavaScript for enhanced code quality
- **React Navigation** - Tab-based navigation system

**Backend & Services**
- **Firebase Authentication** - User authentication and session management
- **Cloud Firestore** - NoSQL database for flexible data storage
- **Expo Notifications** - Push notification delivery
- **Firebase Cloud Services** - Real-time synchronization and cloud hosting

**Development Tools**
- **Visual Studio Code** - Primary IDE
- **Git & GitHub** - Version control and source code management
- **Android Studio** - Android emulator for testing
- **Expo-Go** - Used for testing on a real device


**Development Environment**
- **Node.js:** v16 or higher
- **Java Development Kit (JDK):** Required for Android Studio
- **RAM:** 8GB+ recommended for development
- **Android Studio:** For emulator testing

## Installation ##

**For Users**
1. Download Scribit from releases
2. Install the application on your Android device
3. Open the app and create an account or sign in
4. Begin organizing your academic life!

**For Developers**

1. Clone the repository:
```bash
git clone https://github.com/yourusername/scribit.git
cd scribit
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on Android:
   - Press `a` to open in Android emulator
   - Or scan the QR code with the Expo Go app on your physical device



## Known Issues ##


### Calendar Page Text Rendering Error
```
ERROR Text strings must be rendered within a <Text> component.
```
**Explanation:** Some text content on the Calendar page is not properly wrapped in React Native `<Text>` components. This may cause rendering inconsistencies on certain devices but does not prevent core functionality.


## License ##

This project was developed as a university capstone project at Northern Caribbean University.

## Acknowledgments

- **Developer:** Tahjay Ulett
- **Institution:** Northern Caribbean University, Department of Computer and Information Sciences
- **Course:** CPTR490 - Information Science Advanced Project
- **Supervisor:** Mr. Halzen Smith
- **Completion Date:** December 2025

For questions, feedback, or support, please open an issue on this repository.
