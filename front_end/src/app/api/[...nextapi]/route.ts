import { NextRequest, NextResponse } from "next/server";
import { products } from "@/data/products";
import { categories } from "@/data/categories";

export async function GET(
  req: NextRequest,
  { params }: { params: { nextapi: string[] } }
) {
  const path = params.nextapi.join("/");
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  if (path === "products") {
    return NextResponse.json({ products });
  } else if (path.startsWith("products/")) {
    const productId = path.split("/")[1];
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } else if (path === "categories") {
    return NextResponse.json({ categories });
  } else if (path.startsWith("categories/")) {
    const categoryId = path.split("/")[1];
    let category = categories.find(
      (c) => c.id === categoryId || c.slug === categoryId
    );

    if (!category) {
      for (const mainCategory of categories) {
        if (mainCategory.children) {
          const childCategory = mainCategory.children.find(
            (c) => c.id === categoryId || c.slug === categoryId
          );
          if (childCategory) {
            category = childCategory;
            break;
          }
        }
      }
    }

    if (!category) {
      return NextResponse.json(
        { error: "دسته‌بندی یافت نشد" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } else if (path === "search") {
    const query = searchParams.get("q");

    if (!query) {
      return NextResponse.json({ products: [] });
    }

    const searchResults = products.filter(
      (product) =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.description.toLowerCase().includes(query.toLowerCase()) ||
        product.brand.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );

    return NextResponse.json({ products: searchResults });
  }

  return NextResponse.json({ error: "مسیر نامعتبر" }, { status: 404 });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { nextapi: string[] } }
) {
  const path = params.nextapi.join("/");

  try {
    const body = await req.json();

    if (path === "cart/add") {
      return NextResponse.json({
        success: true,
        message: "محصول به سبد خرید اضافه شد",
      });
    } else if (path === "auth/login") {
      const { email, password } = body;

      if (email === "user@example.com" && password === "password") {
        return NextResponse.json({
          success: true,
          user: {
            id: "1",
            name: "کاربر تست",
            email: "user@example.com",
            role: "user",
          },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            message: "ایمیل یا رمز عبور اشتباه است",
          },
          { status: 401 }
        );
      }
    } else if (path === "auth/register") {
      const { name, email, password } = body;

      return NextResponse.json({
        success: true,
        user: {
          id: "2",
          name,
          email,
          role: "user",
        },
      });
    } else if (path === "order/create") {
      return NextResponse.json({
        success: true,
        orderId: `ORD-${Date.now()}`,
        message: "سفارش با موفقیت ثبت شد",
      });
    }

    return NextResponse.json({ error: "مسیر نامعتبر" }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "خطا در پردازش درخواست",
      },
      { status: 400 }
    );
  }
}
