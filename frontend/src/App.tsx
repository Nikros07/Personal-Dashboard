import { useState } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'tasks' | 'metrics'>('dashboard');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Personal Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'chat'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Chat
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'tasks'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('metrics')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'metrics'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Metrics
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Tasks Today</span>
                  <span className="font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span>Notes Edited</span>
                  <span className="font-medium">5</span>
                </div>
                <div className="flex justify-between">
                  <span>CPU Usage</span>
                  <span className="font-medium id="cpu-usage">--%</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory</span>
                  <span className="font-medium" id="memory-usage">--%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4" id="activity-list">
                <div className="px-3 py-2 bg-gray-50 rounded">
                  <p className="font-medium">Updated meeting notes</p>
                  <p className="text-sm text-gray-500">2 min ago</p>
                </div>
                <div className="px-3 py-2 bg-gray-50 rounded">
                  <p className="font-medium">Added new task: Buy groceries</p>
                  <p className="text-sm text-gray-500">5 min ago</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 col-span-2">
              <h2 className="text-lg font-semibold mb-4">Quick Notes</h2>
              <div className="h-48 bg-gray-50 rounded p-4 overflow-auto">
                <p className="text-sm">Welcome to your Personal Dashboard! Use the tabs above to navigate between Chat, Tasks, and System Metrics.</p>
                <p className="mt-2 text-sm text-gray-500">Features coming soon: AI-powered summarization, file watcher automation, and more.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <h2 className="px-4 py-3 text-lg font-semibold">Chat with Hermes</h2>
            </div>
            <div className="h-96 overflow-auto p-4 bg-gray-50" id="chat-messages">
              <div className="mb-4 max-w-[80%] ml-auto bg-blue-500 text-white rounded-lg px-3 py-2">
                Hello! How can I assist you today?
              </div>
              <div className="mb-4 max-w-[80%] bg-white rounded-lg px-3 py-2">
                I'd like to summarize a PDF I just downloaded.
              </div>
            </div>
            <div className="flex items-center px-4 py-3 border-t">
              <input
                type="text"
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 rounded-l-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <h2 className="px-4 py-3 text-lg font-semibold">Task Manager</h2>
            </div>
            <div className="p-4">
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Add a new task..."
                  className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
              <div className="space-y-3" id="task-list">
                <div className="flex items-start p-3 bg-gray-50 rounded">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-indigo-600" />
                  <div className="ml-3 flex-1">
                    <p className="font-medium">Review project proposal</p>
                    <p className="text-sm text-gray-500">Due today • High priority</p>
                  </div>
                </div>
                <div className="flex items-start p-3 bg-gray-50 rounded">
                  <input type="checkbox" className="mt-1 h-4 w-4 text-indigo-600" />
                  <div className="ml-3 flex-1">
                    <p className="font-medium">Call dentist for appointment</p>
                    <p className="text-sm text-gray-500">Due tomorrow • Medium priority</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="bg-white rounded-lg shadow">
            <div className="border-b">
              <h2 className="px-4 py-3 text-lg font-semibold">System Metrics</h2>
            </div>
            <div className="grid gap-6 p-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">CPU Usage</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    id="cpu-bar"
                    className="bg-indigo-600 h-2.5 rounded-full"
                    style={{ width: '0%' }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-500" id="cpu-percent">0%</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Memory Usage</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    id="memory-bar"
                    className="bg-green-600 h-2.5 rounded-full"
                    style={{ width: '0%' }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-500" id="memory-percent">0%</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Disk Usage</h3>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    id="disk-bar"
                    className="bg-yellow-600 h-2.5 rounded-full"
                    style={{ width: '0%' }}
                  ></div>
                </div>
                <p className="mt-2 text-sm text-gray-500" id="disk-percent">0%</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Uptime</h3>
                <p className="text-2xl font-bold" id="uptime">0s</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;