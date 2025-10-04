// Mock data for testing and fallback when Composio API fails
export const getMockUpcomingMeetings = () => {
  const now = new Date();

  return [
    {
      id: 'mock-1',
      title: 'Team Standup',
      start: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
      end: new Date(now.getTime() + 2.5 * 60 * 60 * 1000).toISOString(), // 2.5 hours from now
      description: 'Daily team synchronization meeting',
      attendees: [
        { email: 'john@example.com', name: 'John Doe', responseStatus: 'accepted' },
        { email: 'jane@example.com', name: 'Jane Smith', responseStatus: 'accepted' },
      ],
      location: 'Conference Room A',
      meetLink: 'https://meet.google.com/mock-1',
      organizer: { email: 'john@example.com', name: 'John Doe' },
    },
    {
      id: 'mock-2',
      title: 'Product Planning Session',
      start: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
      end: new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString(),
      description: 'Q1 2025 product roadmap planning',
      attendees: [
        { email: 'sarah@example.com', name: 'Sarah Johnson', responseStatus: 'accepted' },
        { email: 'mike@example.com', name: 'Mike Wilson', responseStatus: 'tentative' },
      ],
      location: 'Zoom',
      meetLink: 'https://zoom.us/mock-2',
      organizer: { email: 'sarah@example.com', name: 'Sarah Johnson' },
    },
    {
      id: 'mock-3',
      title: 'Client Demo',
      start: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // 2 days from now
      end: new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString(),
      description: 'Showcase new features to the client',
      attendees: [
        { email: 'client@example.com', name: 'Client Representative', responseStatus: 'accepted' },
      ],
      location: 'Virtual',
      meetLink: 'https://meet.google.com/mock-3',
      organizer: { email: 'you@example.com', name: 'You' },
    },
    {
      id: 'mock-4',
      title: 'Engineering Review',
      start: new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString(), // 3 days from now
      end: new Date(now.getTime() + 73 * 60 * 60 * 1000).toISOString(),
      description: 'Code review and architecture discussion',
      attendees: [
        { email: 'tech-lead@example.com', name: 'Tech Lead', responseStatus: 'accepted' },
        { email: 'engineer1@example.com', name: 'Engineer 1', responseStatus: 'accepted' },
        { email: 'engineer2@example.com', name: 'Engineer 2', responseStatus: 'accepted' },
      ],
      location: 'Conference Room B',
      meetLink: 'https://meet.google.com/mock-4',
      organizer: { email: 'tech-lead@example.com', name: 'Tech Lead' },
    },
    {
      id: 'mock-5',
      title: 'Sprint Retrospective',
      start: new Date(now.getTime() + 120 * 60 * 60 * 1000).toISOString(), // 5 days from now
      end: new Date(now.getTime() + 121.5 * 60 * 60 * 1000).toISOString(),
      description: 'Review the past sprint and plan improvements',
      attendees: [
        { email: 'scrum-master@example.com', name: 'Scrum Master', responseStatus: 'accepted' },
        { email: 'team@example.com', name: 'Team', responseStatus: 'accepted' },
      ],
      location: 'Virtual',
      meetLink: 'https://meet.google.com/mock-5',
      organizer: { email: 'scrum-master@example.com', name: 'Scrum Master' },
    },
  ];
};

export const getMockPastMeetings = () => {
  const now = new Date();

  return [
    {
      id: 'mock-past-1',
      title: 'Weekly Sync',
      start: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      end: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
      description: 'Weekly team synchronization meeting',
      attendees: [
        { email: 'alice@example.com', name: 'Alice Brown', responseStatus: 'accepted' },
        { email: 'bob@example.com', name: 'Bob Green', responseStatus: 'accepted' },
      ],
      location: 'Conference Room A',
      meetLink: 'https://meet.google.com/mock-past-1',
      organizer: { email: 'alice@example.com', name: 'Alice Brown' },
    },
    {
      id: 'mock-past-2',
      title: 'Design Review',
      start: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      end: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
      description: 'Review UI/UX designs for the new feature',
      attendees: [
        { email: 'designer@example.com', name: 'Design Team', responseStatus: 'accepted' },
        { email: 'pm@example.com', name: 'Product Manager', responseStatus: 'accepted' },
      ],
      location: 'Zoom',
      meetLink: 'https://zoom.us/mock-past-2',
      organizer: { email: 'designer@example.com', name: 'Design Team' },
    },
    {
      id: 'mock-past-3',
      title: 'Sprint Planning',
      start: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(), // 2 days ago
      end: new Date(now.getTime() - 46 * 60 * 60 * 1000).toISOString(),
      description: 'Plan tasks and goals for the upcoming sprint',
      attendees: [
        { email: 'team-lead@example.com', name: 'Team Lead', responseStatus: 'accepted' },
        { email: 'dev1@example.com', name: 'Developer 1', responseStatus: 'accepted' },
        { email: 'dev2@example.com', name: 'Developer 2', responseStatus: 'accepted' },
      ],
      location: 'Conference Room B',
      meetLink: 'https://meet.google.com/mock-past-3',
      organizer: { email: 'team-lead@example.com', name: 'Team Lead' },
    },
    {
      id: 'mock-past-4',
      title: 'Customer Feedback Session',
      start: new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString(), // 3 days ago
      end: new Date(now.getTime() - 71 * 60 * 60 * 1000).toISOString(),
      description: 'Gather feedback from key customers',
      attendees: [
        { email: 'customer1@example.com', name: 'Customer 1', responseStatus: 'accepted' },
        { email: 'customer2@example.com', name: 'Customer 2', responseStatus: 'accepted' },
      ],
      location: 'Virtual',
      meetLink: 'https://meet.google.com/mock-past-4',
      organizer: { email: 'cs@example.com', name: 'Customer Success' },
    },
    {
      id: 'mock-past-5',
      title: 'Technical Architecture Discussion',
      start: new Date(now.getTime() - 120 * 60 * 60 * 1000).toISOString(), // 5 days ago
      end: new Date(now.getTime() - 118.5 * 60 * 60 * 1000).toISOString(),
      description: 'Discuss system architecture and scalability',
      attendees: [
        { email: 'architect@example.com', name: 'System Architect', responseStatus: 'accepted' },
        { email: 'senior-dev@example.com', name: 'Senior Developer', responseStatus: 'accepted' },
      ],
      location: 'Conference Room C',
      meetLink: 'https://meet.google.com/mock-past-5',
      organizer: { email: 'architect@example.com', name: 'System Architect' },
    },
  ];
};

