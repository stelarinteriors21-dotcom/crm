import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";

export default async function EditLeadPage({ params }: { params: { id: string } }) {
  const lead = await prisma.lead.findUnique({
    where: { id: params.id }
  });

  if (!lead) {
    redirect("/leads");
  }

  async function updateLead(formData: FormData) {
    "use server"
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const source = formData.get("source") as string;
    const status = formData.get("status") as string;
    const budget = formData.get("budget") as string;
    const city = formData.get("city") as string;
    const tag = formData.get("tag") as string;

    await prisma.lead.update({
      where: { id: params.id },
      data: {
        name,
        phone,
        source: source || "Manual",
        status: status || "NEW",
        budget: budget || null,
        city: city || null,
        tag: tag || null,
      }
    });

    redirect("/leads");
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200 mt-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Lead</h1>
      
      <form action={updateLead} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
          <input type="text" name="name" id="name" defaultValue={lead.name} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm" />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input type="tel" name="phone" id="phone" defaultValue={lead.phone} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" id="status" defaultValue={lead.status} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm">
              <option value="NEW">Interested / New</option>
              <option value="CONTACTED">Job Enquiries / Contacted</option>
              <option value="WARM">RNR / Warm</option>
              <option value="CONVERTED">Converted</option>
              <option value="DEAD">Lost / Dead</option>
            </select>
          </div>
          <div>
            <label htmlFor="source" className="block text-sm font-medium text-gray-700">Lead Source</label>
            <select name="source" id="source" defaultValue={lead.source} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm">
              <option value="Manual">Manual Entry</option>
              <option value="Facebook Ads">Facebook Ads</option>
              <option value="Google Ads">Google Ads</option>
              <option value="Website">Website</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700">Budget (Optional)</label>
            <input type="text" name="budget" id="budget" defaultValue={lead.budget || ''} placeholder="e.g. ₹1l - ₹5l" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm" />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700">City (Optional)</label>
            <input type="text" name="city" id="city" defaultValue={lead.city || ''} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm" />
          </div>
        </div>

        <div>
          <label htmlFor="tag" className="block text-sm font-medium text-gray-700">Tag (Optional)</label>
          <input type="text" name="tag" id="tag" defaultValue={lead.tag || ''} placeholder="e.g. Urgent" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#4f46e5] focus:border-[#4f46e5] sm:text-sm" />
        </div>

        <div className="pt-4 flex justify-end space-x-3">
          <Link href="/leads" className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
          <button type="submit" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#4f46e5] hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4f46e5]">
            Update Lead
          </button>
        </div>
      </form>
    </div>
  );
}
