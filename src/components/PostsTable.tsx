import { Heart, MessageCircle, Share2, Bookmark, Eye, Image, Film, PlayCircle, Layers } from 'lucide-react';
import { recentPosts, type PostData } from '../data/mockData';

const typeIcons: Record<PostData['type'], React.ReactNode> = {
  image: <Image size={16} />,
  video: <Film size={16} />,
  reel: <PlayCircle size={16} />,
  carousel: <Layers size={16} />,
};

const typeLabels: Record<PostData['type'], string> = {
  image: 'Imagem',
  video: 'Video',
  reel: 'Reel',
  carousel: 'Carrossel',
};

export function PostsTable() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Posts Recentes</h3>
      <p className="text-sm text-gray-500 mb-6">Performance dos ultimos posts</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Post</th>
              <th className="text-left py-3 px-2 text-gray-500 font-medium">Tipo</th>
              <th className="text-center py-3 px-2 text-gray-500 font-medium">
                <Heart size={14} className="inline text-pink-500" />
              </th>
              <th className="text-center py-3 px-2 text-gray-500 font-medium">
                <MessageCircle size={14} className="inline text-purple-500" />
              </th>
              <th className="text-center py-3 px-2 text-gray-500 font-medium">
                <Share2 size={14} className="inline text-orange-500" />
              </th>
              <th className="text-center py-3 px-2 text-gray-500 font-medium">
                <Bookmark size={14} className="inline text-yellow-500" />
              </th>
              <th className="text-center py-3 px-2 text-gray-500 font-medium">
                <Eye size={14} className="inline text-blue-500" />
              </th>
              <th className="text-right py-3 px-2 text-gray-500 font-medium">Eng. %</th>
            </tr>
          </thead>
          <tbody>
            {recentPosts.map((post) => (
              <tr key={post.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-2 max-w-[200px] truncate text-gray-700">{post.caption}</td>
                <td className="py-3 px-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
                    {typeIcons[post.type]}
                    {typeLabels[post.type]}
                  </span>
                </td>
                <td className="py-3 px-2 text-center text-gray-700">{post.likes.toLocaleString('pt-BR')}</td>
                <td className="py-3 px-2 text-center text-gray-700">{post.comments}</td>
                <td className="py-3 px-2 text-center text-gray-700">{post.shares}</td>
                <td className="py-3 px-2 text-center text-gray-700">{post.saves}</td>
                <td className="py-3 px-2 text-center text-gray-700">{post.reach.toLocaleString('pt-BR')}</td>
                <td className="py-3 px-2 text-right">
                  <span className={`inline-flex items-center font-semibold text-xs rounded-full px-2 py-0.5 ${
                    post.engagementRate >= 10
                      ? 'bg-emerald-50 text-emerald-700'
                      : post.engagementRate >= 5
                      ? 'bg-yellow-50 text-yellow-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {post.engagementRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
